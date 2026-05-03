"""
Supabase service layer for recordings, transcripts, and AI messages.

Uses the Supabase service-role client (backend-only).
Never logs or exposes secret values.
"""

import logging
import uuid
from datetime import datetime
from typing import Any

from supabase import create_client, Client

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Singleton Supabase client ──

_client: Client | None = None


def get_supabase_client() -> Client:
    """Return a cached Supabase service-role client."""
    global _client
    if _client is None:
        logger.info(
            "[Supabase] Initialising client  url=%s...%s",
            settings.SUPABASE_URL[:12],
            settings.SUPABASE_URL[-4:],
        )
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _client


# ── Storage helpers ──


def generate_storage_path(meeting_id: str, extension: str = "webm") -> str:
    """Generate a unique storage path inside the recordings bucket."""
    ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    uid = uuid.uuid4().hex[:8]
    return f"recordings/{meeting_id}/{ts}-{uid}.{extension}"


async def upload_recording(
    meeting_id: str,
    file_bytes: bytes,
    mime_type: str = "audio/webm",
    duration_seconds: int | None = None,
) -> dict[str, Any]:
    """
    Upload an audio file to Supabase Storage and insert a metadata row
    into meeting_recordings.

    Returns the inserted recording row as a dict.
    """
    client = get_supabase_client()
    bucket = settings.SUPABASE_RECORDINGS_BUCKET

    ext = mime_type.split("/")[-1] if "/" in mime_type else "webm"
    storage_path = generate_storage_path(meeting_id, ext)

    # Upload to storage
    logger.info(
        "[Supabase] Uploading recording  bucket=%s  path=%s  size=%d",
        bucket, storage_path, len(file_bytes),
    )
    client.storage.from_(bucket).upload(
        storage_path,
        file_bytes,
        file_options={"content-type": mime_type},
    )

    # Insert metadata row
    row = {
        "meeting_id": meeting_id,
        "storage_bucket": bucket,
        "storage_path": storage_path,
        "status": "uploaded",
        "mime_type": mime_type,
    }
    if duration_seconds is not None:
        row["duration_seconds"] = duration_seconds

    result = client.table("meeting_recordings").insert(row).execute()
    record = result.data[0] if result.data else row
    logger.info("[Supabase] Recording row inserted  id=%s", record.get("id"))
    return record


async def get_recordings_by_meeting(meeting_id: str) -> list[dict[str, Any]]:
    """Return all recording rows for a given meeting, newest first."""
    client = get_supabase_client()
    result = (
        client.table("meeting_recordings")
        .select("*")
        .eq("meeting_id", meeting_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


# ── Transcript helpers ──


async def create_transcript(data: dict[str, Any]) -> dict[str, Any]:
    """Insert a transcript row into meeting_transcripts."""
    client = get_supabase_client()
    result = client.table("meeting_transcripts").insert(data).execute()
    record = result.data[0] if result.data else data
    logger.info("[Supabase] Transcript row inserted  id=%s", record.get("id"))
    return record


async def get_transcripts_by_meeting(meeting_id: str) -> list[dict[str, Any]]:
    """Return transcripts for a meeting, newest first."""
    client = get_supabase_client()
    result = (
        client.table("meeting_transcripts")
        .select("*")
        .eq("meeting_id", meeting_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


# ── AI message helpers ──


async def create_ai_message(data: dict[str, Any]) -> dict[str, Any]:
    """Insert a row into meeting_ai_messages."""
    client = get_supabase_client()
    result = client.table("meeting_ai_messages").insert(data).execute()
    record = result.data[0] if result.data else data
    logger.info("[Supabase] AI message row inserted  id=%s", record.get("id"))
    return record


async def get_ai_messages_by_meeting(meeting_id: str) -> list[dict[str, Any]]:
    """Return AI messages for a meeting, ordered by created_at asc."""
    client = get_supabase_client()
    result = (
        client.table("meeting_ai_messages")
        .select("*")
        .eq("meeting_id", meeting_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []
