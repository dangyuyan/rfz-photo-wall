import type {
  ApiResponse,
  Person,
  Photo,
  RegisterUploadedPhotoPayload,
  UpdatePhotoPayload,
  UploadPhotoPayload,
} from "../types"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  (import.meta.env.DEV ? "http://localhost:8000" : "")

type ErrorDetailItem = {
  msg?: string
  loc?: Array<string | number>
}

function extractTextErrorMessage(payload: string, status: number): string {
  const normalized = payload.trim()

  if (!normalized) {
    return "请求失败，请稍后再试"
  }

  if (
    status === 413 ||
    normalized.includes("FUNCTION_PAYLOAD_TOO_LARGE") ||
    normalized.toLowerCase().includes("payload too large")
  ) {
    return "上传内容过大，请压缩图片或分批上传（线上单次请求建议控制在 4MB 以内）。"
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
      throw new Error("上传内容过大，请压缩图片或分批上传（线上单次请求建议控制在 4MB 以内）。")
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

export async function uploadPhotos(files: File[], items: UploadPhotoPayload[]) {
  const formData = new FormData()
  formData.append("payload", JSON.stringify({ items }))

  files.forEach((file) => {
    formData.append("files", file)
  })

  return request<Photo[]>("/api/photos/upload", {
    method: "POST",
    body: formData,
  })
}

export function registerUploadedPhotos(items: RegisterUploadedPhotoPayload[]) {
  return request<Photo[]>("/api/photos/register-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  })
}
