from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.config import get_settings


def _ensure_column(
    connection: sqlite3.Connection,
    table_name: str,
    column_name: str,
    ddl: str,
) -> None:
    columns = {
        row[1] for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    if column_name not in columns:
        connection.execute(f"ALTER TABLE {table_name} ADD COLUMN {ddl}")


def _sqlite_path_from_url(database_url: str) -> Path:
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        raise RuntimeError("当前仅支持 sqlite:/// 开头的 DATABASE_URL")

    raw_path = database_url.removeprefix(prefix)
    candidate = Path(raw_path)
    if candidate.is_absolute():
        return candidate

    backend_root = Path(__file__).resolve().parents[2]
    return (backend_root / candidate).resolve()


def get_database_path() -> Path:
    return _sqlite_path_from_url(get_settings().database_url)


def init_database() -> None:
    database_path = get_database_path()
    database_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(database_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS persons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                image_url TEXT NOT NULL,
                media_type TEXT NOT NULL DEFAULT 'image',
                poster_url TEXT,
                duration_seconds REAL,
                width INTEGER,
                height INTEGER,
                shot_month TEXT
            );

            CREATE TABLE IF NOT EXISTS photo_persons (
                photo_id INTEGER NOT NULL,
                person_id INTEGER NOT NULL,
                PRIMARY KEY (photo_id, person_id),
                FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
                FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_photos_wall_order
                ON photos(id DESC);

            CREATE INDEX IF NOT EXISTS idx_photos_timeline_order
                ON photos(shot_month DESC, id DESC);

            CREATE INDEX IF NOT EXISTS idx_photo_persons_photo_id
                ON photo_persons(photo_id);

            CREATE INDEX IF NOT EXISTS idx_photo_persons_person_id
                ON photo_persons(person_id);
            """
        )

        _ensure_column(
            connection,
            "photos",
            "media_type",
            "media_type TEXT NOT NULL DEFAULT 'image'",
        )
        _ensure_column(connection, "photos", "poster_url", "poster_url TEXT")
        _ensure_column(
            connection,
            "photos",
            "duration_seconds",
            "duration_seconds REAL",
        )
        _ensure_column(connection, "photos", "width", "width INTEGER")
        _ensure_column(connection, "photos", "height", "height INTEGER")


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(get_database_path())
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
