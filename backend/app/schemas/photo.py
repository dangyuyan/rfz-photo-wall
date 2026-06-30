from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

MediaType = Literal["image", "video"]


class PhotoPerson(BaseModel):
    id: int
    name: str


class Photo(BaseModel):
    id: int
    title: str | None = None
    image_url: str
    media_type: MediaType = "image"
    poster_url: str | None = None
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None
    shot_month: str | None = None
    persons: list[PhotoPerson] = Field(default_factory=list)


class UpdatePhotoRequest(BaseModel):
    title: str | None = None
    shot_month: str | None = None
    person_ids: list[int] = Field(default_factory=list)


class UploadPhotoItem(BaseModel):
    title: str | None = None
    shot_month: str | None = None
    person_ids: list[int] = Field(default_factory=list)


class UploadPhotosRequest(BaseModel):
    items: list[UploadPhotoItem]
