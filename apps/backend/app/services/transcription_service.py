"""
Transcription service.

Orchestrates the full transcription pipeline:
  1. Find latest recording for a meetingId
  2. Download audio from Supabase Storage
  3. Transcribe via Google Gemini API
  4. Save transcript into meeting_transcripts table

Uses the google-genai SDK.
Never exposes API keys or raw stack traces.
"""

import base64
import logging
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.services.supabase_service import (
    get_recordings_by_meeting,
    download_recording_file,
    create_transcript,
)

logger = logging.getLogger(__name__)

# Threshold for switching from inline data to the Files API.
# Gemini inline data limit is ~20 MB; we use 15 MB as a safe margin.
_INLINE_SIZE_LIMIT = 15 * 1024 * 1024  # 15 MB

# Default transcription prompt
_TRANSCRIPTION_PROMPT = (
    "Transcribe this meeting audio in Turkish. "
    "Return only the transcript text. "
    "Do not summarize. Do not add commentary. "
    "If the audio contains multiple speakers, you may label them as "
    "Speaker 1, Speaker 2 only when obvious."
)


def _get_gemini_client() -> genai.Client:
    """Return a Gemini client. Raises if the API key is not configured."""
    if not settings.GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. "
            "Set it in the backend .env file."
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _resolve_mime_type(mime_type: str | None) -> str:
    """Normalise / default the MIME type for the audio file."""
    if mime_type and mime_type.startswith("audio/"):
        return mime_type
    return "audio/webm"


async def _transcribe_with_gemini(
    audio_bytes: bytes,
    mime_type: str,
) -> str:
    """
    Send audio to Gemini and return the transcription text.

    * For files ≤ _INLINE_SIZE_LIMIT the audio is sent as inline data.
    * For larger files the Gemini Files API is used to upload first.

    Returns the raw transcript text from Gemini.
    """
    client = _get_gemini_client()
    model = settings.GEMINI_TRANSCRIPTION_MODEL

    if len(audio_bytes) <= _INLINE_SIZE_LIMIT:
        # ── Inline data path ──
        logger.info(
            "[Transcription] Using inline data  size=%d  mime=%s  model=%s",
            len(audio_bytes), mime_type, model,
        )

        response = client.models.generate_content(
            model=model,
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                        types.Part.from_text(text=_TRANSCRIPTION_PROMPT),
                    ]
                )
            ],
        )
    else:
        # ── Files API path (for large audio) ──
        logger.info(
            "[Transcription] Using Files API  size=%d  mime=%s  model=%s",
            len(audio_bytes), mime_type, model,
        )

        uploaded_file = client.files.upload(
            file=audio_bytes,
            config=types.UploadFileConfig(mime_type=mime_type),
        )
        logger.info(
            "[Transcription] File uploaded  name=%s", uploaded_file.name,
        )

        response = client.models.generate_content(
            model=model,
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_uri(
                            file_uri=uploaded_file.uri,
                            mime_type=mime_type,
                        ),
                        types.Part.from_text(text=_TRANSCRIPTION_PROMPT),
                    ]
                )
            ],
        )

    # Extract text from the response
    text = response.text
    if not text or not text.strip():
        raise RuntimeError("Gemini returned an empty transcript.")

    return text.strip()


async def transcribe_meeting(meeting_id: str) -> dict[str, Any]:
    """
    End-to-end transcription for a meeting.

    Steps:
        1. Fetch the latest recording from meeting_recordings.
        2. Download the audio file from Supabase Storage.
        3. Send to Gemini API for transcription.
        4. Save transcript row in meeting_transcripts.
        5. Return the transcript record.

    Raises RuntimeError with a user-friendly message on failure.
    """

    # ── 1. Find latest recording ──
    recordings = await get_recordings_by_meeting(meeting_id)
    if not recordings:
        raise RuntimeError(
            f"No recordings found for meeting '{meeting_id}'. "
            "Please record audio first."
        )

    latest = recordings[0]  # already sorted newest-first
    recording_id = latest.get("id")
    storage_path = latest.get("storage_path")
    mime_type = _resolve_mime_type(latest.get("mime_type"))

    if not storage_path:
        raise RuntimeError("Recording metadata is missing storage_path.")

    logger.info(
        "[Transcription] Starting  meeting=%s  recording=%s  path=%s",
        meeting_id, recording_id, storage_path,
    )

    # ── 2. Download audio ──
    try:
        audio_bytes = await download_recording_file(storage_path)
    except Exception as exc:
        error_msg = f"Failed to download recording: {exc}"
        logger.error("[Transcription] %s", error_msg)
        # Save failed transcript row
        await _save_failed_transcript(meeting_id, recording_id, error_msg)
        raise RuntimeError(error_msg) from exc

    logger.info(
        "[Transcription] Downloaded %d bytes  mime=%s",
        len(audio_bytes), mime_type,
    )

    # ── 3. Transcribe via Gemini ──
    try:
        full_text = await _transcribe_with_gemini(audio_bytes, mime_type)

        logger.info(
            "[Transcription] Completed  chars=%d",
            len(full_text),
        )
    except Exception as exc:
        error_msg = f"Gemini transcription failed: {exc}"
        logger.error("[Transcription] %s", error_msg)
        await _save_failed_transcript(meeting_id, recording_id, error_msg)
        raise RuntimeError("Transcription failed. Please try again later.") from exc

    # ── 4. Save transcript ──
    try:
        row = {
            "meeting_id": meeting_id,
            "recording_id": recording_id,
            "status": "completed",
            "language": "tr",
            "full_text": full_text,
            "segments": [],
            "error_message": None,
        }
        record = await create_transcript(row)
        logger.info(
            "[Transcription] Saved transcript  id=%s", record.get("id"),
        )
        return record
    except Exception as exc:
        error_msg = f"Failed to save transcript: {exc}"
        logger.error("[Transcription] %s", error_msg)
        raise RuntimeError(
            "Transcription succeeded but failed to save. Please try again."
        ) from exc


async def _save_failed_transcript(
    meeting_id: str,
    recording_id: str | None,
    error_message: str,
) -> None:
    """Best-effort: save a 'failed' transcript row for visibility."""
    try:
        row = {
            "meeting_id": meeting_id,
            "status": "failed",
            "language": "tr",
            "full_text": None,
            "segments": [],
            "error_message": error_message[:500],  # truncate long errors
        }
        if recording_id:
            row["recording_id"] = recording_id
        await create_transcript(row)
    except Exception:
        logger.warning(
            "[Transcription] Could not save failed transcript row for meeting=%s",
            meeting_id,
            exc_info=True,
        )
