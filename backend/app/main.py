from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import persons, photos
from app.config import get_settings
from app.schemas.common import ApiResponse
from app.services.db import init_database

app = FastAPI(title="RFZ Photo Wall API", version="0.1.0")
settings = get_settings()

init_database()
settings.upload_dir.mkdir(parents=True, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(persons.router)
app.include_router(photos.router)


@app.get("/api/health", response_model=ApiResponse[dict[str, str]])
def health_check() -> ApiResponse[dict[str, str]]:
    return ApiResponse(data={"status": "ok"})
