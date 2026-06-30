from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ProcessedMedia:
    file_extension: str
    file_content: bytes
    poster_extension: str | None = None
    poster_content: bytes | None = None
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None


def _tool_exists(name: str) -> bool:
    return shutil.which(name) is not None


def _as_float(value: object) -> float | None:
    if value in (None, "", "N/A"):
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_int(value: object) -> int | None:
    if value in (None, "", "N/A"):
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _probe_video(video_path: Path) -> tuple[float | None, int | None, int | None]:
    if not _tool_exists("ffprobe"):
        return None, None, None

    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(video_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout or "{}")
    video_stream = next(
        (stream for stream in payload.get("streams", []) if stream.get("codec_type") == "video"),
        {},
    )
    format_info = payload.get("format", {})

    duration_raw = format_info.get("duration") or video_stream.get("duration")
    duration_seconds = _as_float(duration_raw)
    width = _as_int(video_stream.get("width"))
    height = _as_int(video_stream.get("height"))

    return duration_seconds, width, height


def _transcode_video(input_path: Path, output_path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(input_path),
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            str(output_path),
        ],
        check=True,
        capture_output=True,
    )


def _generate_video_poster(input_path: Path, poster_path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(input_path),
            "-vf",
            "thumbnail,scale=960:-1",
            "-frames:v",
            "1",
            str(poster_path),
        ],
        check=True,
        capture_output=True,
    )


def process_video_upload(filename: str, content: bytes) -> ProcessedMedia:
    suffix = Path(filename).suffix.lower() or ".mp4"

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        input_path = temp_path / f"source{suffix}"
        input_path.write_bytes(content)

        duration_seconds, width, height = _probe_video(input_path)

        if not _tool_exists("ffmpeg"):
            return ProcessedMedia(
                file_extension=suffix,
                file_content=content,
                duration_seconds=duration_seconds,
                width=width,
                height=height,
            )

        output_path = temp_path / "output.mp4"
        poster_path = temp_path / "poster.jpg"

        try:
            _transcode_video(input_path, output_path)
            _generate_video_poster(output_path, poster_path)
            processed_duration, processed_width, processed_height = _probe_video(output_path)

            return ProcessedMedia(
                file_extension=".mp4",
                file_content=output_path.read_bytes(),
                poster_extension=".jpg",
                poster_content=poster_path.read_bytes() if poster_path.exists() else None,
                duration_seconds=processed_duration if processed_duration is not None else duration_seconds,
                width=processed_width if processed_width is not None else width,
                height=processed_height if processed_height is not None else height,
            )
        except (subprocess.CalledProcessError, OSError):
            return ProcessedMedia(
                file_extension=suffix,
                file_content=content,
                duration_seconds=duration_seconds,
                width=width,
                height=height,
            )
