export type Person = {
  id: number
  name: string
}

export type MediaType = "image" | "video"

export type Photo = {
  id: number
  title: string | null
  image_url: string
  media_type: MediaType
  poster_url: string | null
  duration_seconds: number | null
  width: number | null
  height: number | null
  shot_month: string | null
  persons: Person[]
}

export type ApiResponse<T> = {
  data: T
  message?: string | null
}

export type UpdatePhotoPayload = {
  title: string | null
  shot_month: string | null
  person_ids: number[]
}

export type UploadPhotoPayload = {
  title: string | null
  shot_month: string | null
  person_ids: number[]
}
