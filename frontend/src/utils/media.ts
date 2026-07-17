import type { Photo } from "../types"

function formatDuration(seconds: number) {
  const totalSeconds = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
}

export function buildMediaSummary(photo: Pick<Photo, "media_type" | "duration_seconds" | "width" | "height">) {
  const details: string[] = []

  if (photo.width && photo.height) {
    details.push(`${photo.width} × ${photo.height}`)
  }

  if (photo.media_type === "video" && photo.duration_seconds !== null) {
    details.push(formatDuration(photo.duration_seconds))
  }

  return details.join(" · ")
}
