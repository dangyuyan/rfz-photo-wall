import type {
  ApiResponse,
  Person,
  Photo,
  UpdatePhotoPayload,
  UploadPhotoPayload,
} from "../types"

type RequestOptions = RequestInit & {
  timeoutMs?: number
}

type UploadProgressCallback = (progress: {
  loaded: number
  total: number
  percent: number
}) => void

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

function getLocalApiBaseUrl() {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000"
  }

  const { hostname, protocol } = window.location
  const localHostname = LOCAL_HOSTS.has(hostname) ? hostname : "127.0.0.1"
  return `${protocol}//${localHostname}:8000`
}

function normalizeApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "")

  if (!configuredBaseUrl) {
    return import.meta.env.DEV ? getLocalApiBaseUrl() : ""
  }

  if (typeof window === "undefined") {
    return configuredBaseUrl
  }

  try {
    const configuredUrl = new URL(configuredBaseUrl)
    const currentHost = window.location.hostname
    const configuredHost = configuredUrl.hostname

    if (LOCAL_HOSTS.has(configuredHost) && LOCAL_HOSTS.has(currentHost)) {
      configuredUrl.hostname = currentHost
      return configuredUrl.origin
    }

    if (LOCAL_HOSTS.has(configuredHost) && !LOCAL_HOSTS.has(currentHost)) {
      return ""
    }

    if (!import.meta.env.DEV && configuredHost === currentHost) {
      return ""
    }

    if (configuredUrl.origin === window.location.origin) {
      return ""
    }
  } catch {
    return configuredBaseUrl
  }

  return configuredBaseUrl
}

const API_BASE_URL = normalizeApiBaseUrl()

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

async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  let response: Response
  const { timeoutMs = 120_000, ...requestInit } = init || {}
  const method = (requestInit.method || "GET").toUpperCase()
  const requestPath =
    method === "GET"
      ? `${path}${path.includes("?") ? "&" : "?"}_=${Date.now()}`
      : path
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    response = await fetch(`${API_BASE_URL}${requestPath}`, {
      cache: "no-store",
      ...requestInit,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("请求超时，请检查手机网络或服务器接口地址后重试。")
    }

    throw new Error("无法连接到服务，请检查网络、接口地址或稍后重试。")
  } finally {
    window.clearTimeout(timeoutId)
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

function normalizeMediaUrl(url: string | null | undefined) {
  if (!url) {
    return null
  }

  if (url.startsWith("/uploads/")) {
    return url
  }

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.pathname.startsWith("/uploads/")) {
      return parsedUrl.pathname
    }
  } catch {
    return url
  }

  return url
}

function normalizePhoto(photo: Photo): Photo {
  return {
    ...photo,
    image_url: normalizeMediaUrl(photo.image_url) || photo.image_url,
    poster_url: normalizeMediaUrl(photo.poster_url),
  }
}

function parseApiResponse<T>(responseText: string, status: number, contentType: string): T {
  const isJson = contentType.includes("application/json")
  const payload = isJson && responseText ? JSON.parse(responseText) : responseText

  if (status < 200 || status >= 300) {
    if (typeof payload === "string" && payload.trim()) {
      throw new Error(extractTextErrorMessage(payload, status))
    }

    if (status === 413) {
      throw new Error("上传内容过大，请减少单次上传数量或压缩后重试。")
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

export function removePerson(personId: number) {
  return request<{ id: number }>(`/api/persons/${personId}`, {
    method: "DELETE",
  })
}

export function listPhotos(view: "timeline" | "wall") {
  return request<Photo[]>(`/api/photos?view=${view}`).then((photos) =>
    photos.map(normalizePhoto),
  )
}

export function updatePhoto(photoId: number, payload: UpdatePhotoPayload) {
  return request<Photo>(`/api/photos/${photoId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).then(normalizePhoto)
}

export function removePhoto(photoId: number) {
  return request<{ id: number }>(`/api/photos/${photoId}`, {
    method: "DELETE",
    timeoutMs: 30_000,
  })
}

export async function uploadPhotos(
  files: File[],
  items: UploadPhotoPayload[],
  onProgress?: UploadProgressCallback,
) {
  if (files.length !== items.length) {
    throw new Error("上传文件数量与元数据数量不一致。")
  }

  const formData = new FormData()
  for (const file of files) {
    formData.append("files", file)
  }
  formData.append("payload", JSON.stringify({ items }))

  return new Promise<Photo[]>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open("POST", `${API_BASE_URL}/api/photos/upload`)
    xhr.timeout = 900_000

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return
      }

      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      })
    }

    xhr.onload = () => {
      try {
        const photos = parseApiResponse<Photo[]>(
          xhr.responseText,
          xhr.status,
          xhr.getResponseHeader("content-type") || "",
        )
        resolve(photos.map(normalizePhoto))
      } catch (error) {
        reject(error)
      }
    }

    xhr.onerror = () => {
      reject(new Error("上传连接失败，请检查手机网络或服务器接口地址后重试。"))
    }

    xhr.ontimeout = () => {
      reject(new Error("上传超时，请确认手机网络稳定，或尝试压缩图片后重试。"))
    }

    xhr.send(formData)
  })
}
