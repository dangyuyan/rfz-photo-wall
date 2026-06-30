from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _first_non_empty(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


@dataclass(frozen=True)
class Settings:
    database_url: str
    upload_dir: Path
    public_base_url: str
    cors_origins: tuple[str, ...]


def _parse_cors_origins(raw_value: str | None) -> tuple[str, ...]:
    if not raw_value:
        return ("http://localhost:5173",)

    origins = [item.strip() for item in raw_value.split(",")]
    return tuple(origin for origin in origins if origin)


@lru_cache
def get_settings() -> Settings:
    backend_root = Path(__file__).resolve().parents[1]
    database_url = os.getenv("DATABASE_URL", "sqlite:///./data/photo_wall.db").strip()
    upload_dir = os.getenv("UPLOAD_DIR", "./uploads").strip() or "./uploads"
    public_base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").strip()

    return Settings(
        database_url=database_url,
        upload_dir=(backend_root / upload_dir).resolve()
        if not Path(upload_dir).is_absolute()
        else Path(upload_dir),
        public_base_url=public_base_url.rstrip("/"),
        cors_origins=_parse_cors_origins(os.getenv("BACKEND_CORS_ORIGINS")),
    )
