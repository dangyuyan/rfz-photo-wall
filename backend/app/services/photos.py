from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote, unquote, urlparse
from uuid import uuid4

from app.config import get_settings
from app.schemas.photo import (
    Photo,
    PhotoPerson,
    UpdatePhotoRequest,
    UploadPhotosRequest,
)
from app.services.db import get_db
from app.services.media_processing import process_video_upload


@dataclass(frozen=True)
class IncomingUploadFile:
    filename: str
    content_type: str
    content: bytes


class PhotoNotFoundError(ValueError):
    pass


def _unique_person_ids(person_ids: list[int]) -> list[int]:
    return list(dict.fromkeys(person_ids))


def _build_public_url(path: str) -> str:
    settings = get_settings()
    quoted_path = quote(path, safe="/")
    if not settings.public_base_url:
        return f"/uploads/{quoted_path}"

    return f"{settings.public_base_url}/uploads/{quoted_path}"


def _extract_storage_path_from_public_url(image_url: str | None) -> str | None:
    if not image_url:
        return None

    marker = "/uploads/"
    parsed = urlparse(image_url)
    path = parsed.path

    if marker not in path:
        return None

    return unquote(path.split(marker, 1)[1])


def _media_type_from_content_type(content_type: str) -> str:
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("video/"):
        return "video"
    raise ValueError("仅支持图片或视频文件")


def _remove_local_file(storage_path: str | None) -> None:
    if not storage_path:
        return

    file_path = get_settings().upload_dir / storage_path
    file_path.unlink(missing_ok=True)


def _query_photos(where_clause: str = "", params: tuple[object, ...] = (), view: str = "timeline") -> list[Photo]:
    order_clause = (
        "ORDER BY photos.id DESC"
        if view == "wall"
        else "ORDER BY photos.shot_month IS NULL, photos.shot_month DESC, photos.id DESC"
    )

    sql = f"""
        SELECT
            photos.id,
            photos.title,
            photos.image_url,
            photos.media_type,
            photos.poster_url,
            photos.duration_seconds,
            photos.width,
            photos.height,
            photos.shot_month,
            persons.id AS person_id,
            persons.name AS person_name
        FROM photos
        LEFT JOIN photo_persons ON photo_persons.photo_id = photos.id
        LEFT JOIN persons ON persons.id = photo_persons.person_id
        {where_clause}
        {order_clause}
    """

    with get_db() as connection:
        rows = connection.execute(sql, params).fetchall()

    if not rows:
        return []

    photos_by_id: dict[int, Photo] = {}
    ordered_ids: list[int] = []

    for row in rows:
        photo_id = row["id"]
        if photo_id not in photos_by_id:
            photos_by_id[photo_id] = Photo(
                id=photo_id,
                title=row["title"],
                image_url=row["image_url"],
                media_type=row["media_type"] or "image",
                poster_url=row["poster_url"],
                duration_seconds=row["duration_seconds"],
                width=row["width"],
                height=row["height"],
                shot_month=row["shot_month"],
                persons=[],
            )
            ordered_ids.append(photo_id)

        if row["person_id"] is not None:
            photos_by_id[photo_id].persons.append(
                PhotoPerson(id=row["person_id"], name=row["person_name"])
            )

    return [photos_by_id[photo_id] for photo_id in ordered_ids]


def _fetch_photo_or_raise(photo_id: int) -> Photo:
    photos = _query_photos("WHERE photos.id = ?", (photo_id,), view="wall")
    if not photos:
        raise PhotoNotFoundError("照片不存在")

    return photos[0]


def _replace_photo_persons(connection, photo_id: int, person_ids: list[int]) -> None:
    connection.execute("DELETE FROM photo_persons WHERE photo_id = ?", (photo_id,))

    if not person_ids:
        return

    known_person_count = connection.execute(
        f"SELECT COUNT(*) FROM persons WHERE id IN ({','.join('?' for _ in person_ids)})",
        tuple(person_ids),
    ).fetchone()[0]
    if known_person_count != len(person_ids):
        raise ValueError("存在无效的成员")

    connection.executemany(
        "INSERT INTO photo_persons(photo_id, person_id) VALUES (?, ?)",
        [(photo_id, person_id) for person_id in person_ids],
    )


def list_photos(view: str) -> list[Photo]:
    return _query_photos(view=view)


def update_photo(photo_id: int, payload: UpdatePhotoRequest) -> Photo:
    title = payload.title.strip() if payload.title else ""
    shot_month = payload.shot_month.strip() if payload.shot_month else ""
    person_ids = _unique_person_ids(payload.person_ids)

    with get_db() as connection:
        cursor = connection.execute(
            """
            UPDATE photos
            SET title = ?, shot_month = ?
            WHERE id = ?
            """,
            (title or None, shot_month or None, photo_id),
        )
        if cursor.rowcount == 0:
            raise PhotoNotFoundError("照片不存在")

        _replace_photo_persons(connection, photo_id, person_ids)

    return _fetch_photo_or_raise(photo_id)


def delete_photo(photo_id: int) -> None:
    with get_db() as connection:
        row = connection.execute(
            "SELECT image_url, poster_url FROM photos WHERE id = ? LIMIT 1",
            (photo_id,),
        ).fetchone()
        if row is None:
            raise PhotoNotFoundError("照片不存在")

        image_url = row["image_url"]
        poster_url = row["poster_url"]
        connection.execute("DELETE FROM photos WHERE id = ?", (photo_id,))

    _remove_local_file(_extract_storage_path_from_public_url(image_url))
    _remove_local_file(_extract_storage_path_from_public_url(poster_url))


def upload_photos(
    files: list[IncomingUploadFile], payload: UploadPhotosRequest
) -> list[Photo]:
    if len(files) != len(payload.items):
        raise ValueError("上传文件数量与元数据数量不一致")

    created_photos: list[Photo] = []
    upload_dir = get_settings().upload_dir
    upload_dir.mkdir(parents=True, exist_ok=True)

    for file, item in zip(files, payload.items, strict=True):
        media_type = _media_type_from_content_type(file.content_type)

        if not file.content:
            raise ValueError(f"{file.filename} 文件内容为空")

        file_extension = Path(file.filename).suffix or ".jpg"
        title = item.title.strip() if item.title else ""
        shot_month = item.shot_month.strip() if item.shot_month else ""
        person_ids = _unique_person_ids(item.person_ids)
        processed_file_content = file.content
        processed_file_extension = file_extension.lower()
        poster_content: bytes | None = None
        poster_extension: str | None = None
        duration_seconds: float | None = None
        width: int | None = None
        height: int | None = None

        if media_type == "video":
            processed_media = process_video_upload(file.filename, file.content)
            processed_file_content = processed_media.file_content
            processed_file_extension = processed_media.file_extension
            poster_content = processed_media.poster_content
            poster_extension = processed_media.poster_extension
            duration_seconds = processed_media.duration_seconds
            width = processed_media.width
            height = processed_media.height

        storage_path = f"{uuid4().hex}{processed_file_extension.lower()}"
        file_path = upload_dir / storage_path
        poster_storage_path = (
            f"{uuid4().hex}{poster_extension.lower()}" if poster_extension and poster_content else None
        )
        poster_path = upload_dir / poster_storage_path if poster_storage_path else None
        photo_id: int | None = None

        try:
            file_path.write_bytes(processed_file_content)
            if poster_path is not None and poster_content is not None:
                poster_path.write_bytes(poster_content)

            with get_db() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO photos(
                        title,
                        image_url,
                        media_type,
                        poster_url,
                        duration_seconds,
                        width,
                        height,
                        shot_month
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        title or None,
                        _build_public_url(storage_path),
                        media_type,
                        _build_public_url(poster_storage_path) if poster_storage_path else None,
                        duration_seconds,
                        width,
                        height,
                        shot_month or None,
                    ),
                )
                photo_id = cursor.lastrowid

                if photo_id is None:
                    raise RuntimeError(f"写入照片记录失败: {file.filename}")

                _replace_photo_persons(connection, photo_id, person_ids)

            created_photos.append(_fetch_photo_or_raise(photo_id))
        except Exception:
            if photo_id is not None:
                with get_db() as connection:
                    connection.execute("DELETE FROM photos WHERE id = ?", (photo_id,))
            file_path.unlink(missing_ok=True)
            if poster_path is not None:
                poster_path.unlink(missing_ok=True)
            raise

    return created_photos
