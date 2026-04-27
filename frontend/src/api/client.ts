import type {
  ApiResponse,
  Person,
  Photo,
  UpdatePhotoPayload,
  UploadPhotoPayload,
} from "../types"
import { supabase } from "../lib/supabase"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  (import.meta.env.DEV ? "http://localhost:8000" : "")
const SUPABASE_BUCKET = "photos"

type RegisterUploadedPhotoPayload = UploadPhotoPayload & {
  image_url: string
}

type ErrorDetailItem = {
  msg?: string
  loc?: Array<string | number>
}

function extractTextErrorMessage(payload: string, status: number): string {
  const normalized = payload.trim()

  if (!normalized) {
    return "请求失败，请稍后再试"
  }

  if (normalized.includes("FUNCTION_PAYLOAD_TOO_LARGE") || normalized.toLowerCase().includes("payload too large")) {
    return "上传内容过大，请压缩图片后再试。"
  }

  return normalized
}

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "请求失败，请稍后再试"
  }

  const record = payload as Record<string, unknown>

  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message
  }

  if (Array.isArray(record.detail)) {
    const messages = record.detail
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null
        }

        const detailItem = item as ErrorDetailItem
        if (!detailItem.msg) {
          return null
        }

        const location = Array.isArray(detailItem.loc) ? detailItem.loc.join(".") : ""
        return location ? `${location}: ${detailItem.msg}` : detailItem.msg
      })
      .filter((message): message is string => Boolean(message))

    if (messages.length > 0) {
      return messages.join("\n")
    }
  }

  return "请求失败，请稍后再试"
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, init)
  } catch {
    throw new Error("无法连接到服务，请检查网络、接口地址或稍后重试。")
  }

  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    if (typeof payload === "string" && payload.trim()) {
      throw new Error(extractTextErrorMessage(payload, response.status))
    }

    if (response.status === 413) {
      throw new Error("上传内容过大，请压缩图片后再试。")
    }

    throw new Error(extractErrorMessage(payload))
  }

  return (payload as ApiResponse<T>).data
}

export function listPersons() {
  return request<Person[]>("/api/persons")
}

export function createPerson(name: string) {
  return request<Person>("/api/persons", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  })
}

export function listPhotos(view: "timeline" | "wall") {
  return request<Photo[]>(`/api/photos?view=${view}`)
}

export function updatePhoto(photoId: number, payload: UpdatePhotoPayload) {
  return request<Photo>(`/api/photos/${photoId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}

export function removePhoto(photoId: number) {
  return request<{ id: number }>(`/api/photos/${photoId}`, {
    method: "DELETE",
  })
}

function buildStoragePath(file: File) {
  const extension = file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : ""
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return `${randomId}${extension || ".jpg"}`
}

async function uploadFileToSupabase(file: File) {
  const storagePath = buildStoragePath(file)
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(storagePath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  })

  if (error) {
    throw new Error(error.message || `${file.name} 上传到存储失败`)
  }

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath)

  if (!data.publicUrl) {
    throw new Error(`${file.name} 上传成功，但未能获取公开地址`)
  }

  return {
    storagePath,
    image_url: data.publicUrl,
  }
}

export async function uploadPhotos(files: File[], items: UploadPhotoPayload[]) {
  if (files.length !== items.length) {
    throw new Error("上传文件数量与元数据数量不一致")
  }

  const uploadedResults: Array<{ storagePath: string; image_url: string }> = []

  try {
    for (const file of files) {
      uploadedResults.push(await uploadFileToSupabase(file))
    }

    const registerItems: RegisterUploadedPhotoPayload[] = items.map((item, index) => ({
      ...item,
      image_url: uploadedResults[index].image_url,
    }))

    return request<Photo[]>("/api/photos/register-upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: registerItems }),
    })
  } catch (error) {
    if (uploadedResults.length > 0) {
      const uploadedPaths = uploadedResults.map((item) => item.storagePath)
      await supabase.storage.from(SUPABASE_BUCKET).remove(uploadedPaths).catch(() => undefined)
    }

    throw error
  }
}
