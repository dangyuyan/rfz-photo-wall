import type { Photo } from "../types"

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim()
}

function getFileExtension(imageUrl: string) {
  try {
    const { pathname } = new URL(imageUrl)
    const match = pathname.match(/\.[a-zA-Z0-9]+$/)
    return match?.[0] || ".jpg"
  } catch {
    return ".jpg"
  }
}

function buildFileName(photo: Photo) {
  const baseName = sanitizeFileName(photo.title || `photo-${photo.id}`) || `photo-${photo.id}`
  const extension = getFileExtension(photo.image_url)
  return baseName.endsWith(extension) ? baseName : `${baseName}${extension}`
}

export async function downloadPhotoToLocal(photo: Photo) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 120_000)
  let response: Response

  try {
    response = await fetch(photo.image_url, {
      cache: "no-store",
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("下载超时，请检查手机网络后重试")
    }

    throw new Error("无法连接到文件地址，请检查网络后重试")
  } finally {
    window.clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw new Error("下载文件失败，请稍后再试")
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = objectUrl
  link.download = buildFileName(photo)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}
