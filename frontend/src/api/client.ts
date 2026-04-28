import type {
  ApiResponse,
  Person,
  Photo,
  UpdatePhotoPayload,
  UploadPhotoPayload,
  UploadTicket,
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
    return "上传内容过大，请减少单次上传数量或分批上传。"
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
      throw new Error("上传内容过大，请减少单次上传数量或分批上传。")
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

async function uploadFileToSignedUrl(file: File, signedUrl: string) {
  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(extractTextErrorMessage(payload, response.status))
  }
}

export async function uploadPhotos(files: File[], items: UploadPhotoPayload[]) {
  if (files.length !== items.length) {
    throw new Error("上传文件数量与元数据数量不一致。")
  }

  const tickets = await request<UploadTicket[]>("/api/photos/upload-tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: files.map((file) => ({
        filename: file.name,
        content_type: file.type || "application/octet-stream",
      })),
    }),
  })

  if (tickets.length !== files.length) {
    throw new Error("创建上传地址失败，请稍后重试。")
  }

  for (let index = 0; index < files.length; index += 1) {
    await uploadFileToSignedUrl(files[index], tickets[index].signed_url)
  }

  return request<Photo[]>("/api/photos/upload-finalize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: items.map((item, index) => ({
        ...item,
        storage_path: tickets[index].storage_path,
      })),
    }),
  })
}
