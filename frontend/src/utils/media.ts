import type { Photo } from "../types"

export function formatDuration(durationSeconds: number | null) {
  if (durationSeconds === null || Number.isNaN(durationSeconds)) {
    return ""
  }

  const totalSeconds = Math.max(0, Math.round(durationSeconds))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) {
    return `${seconds} 秒`
  }

  return `${minutes} 分 ${String(seconds).padStart(2, "0")} 秒`
}

export function formatResolution(width: number | null, height: number | null) {
  if (!width || !height) {
    return ""
  }

  return `${width} x ${height}`
}

export function buildMediaSummary(photo: Photo) {
  const parts: string[] = []

  if (photo.media_type === "video") {
    parts.push("视频")
  }

  const duration = formatDuration(photo.duration_seconds)
  if (duration) {
    parts.push(duration)
  }

  const resolution = formatResolution(photo.width, photo.height)
  if (resolution) {
    parts.push(resolution)
  }

  return parts.join(" · ")
}
