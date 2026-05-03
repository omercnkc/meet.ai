"""
Recording API routes.

POST /api/recordings/upload  — Upload an audio recording
GET  /api/recordings/{meetingId} — Get recording metadata for a meeting
"""

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.integrations.firebase_admin import verify_firebase_token
from app.services.supabase_service import upload_recording, get_recordings_by_meeting

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/recordings", tags=["Recordings"])

_bearer_scheme = HTTPBearer()

# Max upload size: 200 MB
MAX_UPLOAD_BYTES = 200 * 1024 * 1024


@router.post(
    "/upload",
    summary="Upload an audio recording",
    responses={
        401: {"description": "Missing or invalid Firebase ID token"},
        400: {"description": "Invalid request"},
        413: {"description": "File too large"},
        500: {"description": "Upload or database failure"},
    },
)
async def upload_recording_endpoint(
    meetingId: str = Form(...),
    file: UploadFile = File(...),
    durationSeconds: int | None = Form(None),
    mimeType: str | None = Form(None),
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
):
    """
    Upload an audio file to Supabase Storage and create a recording metadata row.

    1. Verify Firebase ID token.
    2. Validate inputs.
    3. Upload file to Supabase Storage.
    4. Insert metadata into meeting_recordings.
    5. Return the recording metadata.
    """

    # ── Auth ──
    await verify_firebase_token(credentials.credentials)

    # ── Validate meetingId ──
    if not meetingId or not meetingId.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="meetingId is required.",
        )

    # ── Read file ──
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    # ── Resolve MIME type ──
    resolved_mime = mimeType or file.content_type or "audio/webm"

    # ── Upload & persist ──
    try:
        record = await upload_recording(
            meeting_id=meetingId,
            file_bytes=file_bytes,
            mime_type=resolved_mime,
            duration_seconds=durationSeconds,
        )
    except Exception as exc:
        logger.exception("[Recordings] Upload failed for meeting=%s", meetingId)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Recording upload failed. Please try again.",
        )

    return {
        "id": record.get("id"),
        "meetingId": record.get("meeting_id"),
        "storageBucket": record.get("storage_bucket"),
        "storagePath": record.get("storage_path"),
        "status": record.get("status"),
        "durationSeconds": record.get("duration_seconds"),
        "mimeType": record.get("mime_type"),
        "createdAt": record.get("created_at"),
    }


@router.get(
    "/{meetingId}",
    summary="Get recording metadata for a meeting",
    responses={
        401: {"description": "Missing or invalid Firebase ID token"},
        404: {"description": "No recordings found for this meeting"},
    },
)
async def get_recordings_endpoint(
    meetingId: str,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
):
    """Return recording metadata for the given meeting ID."""

    # ── Auth ──
    await verify_firebase_token(credentials.credentials)

    try:
        recordings = await get_recordings_by_meeting(meetingId)
    except Exception as exc:
        logger.exception("[Recordings] Query failed for meeting=%s", meetingId)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch recordings.",
        )

    if not recordings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No recordings found for this meeting.",
        )

    return [
        {
            "id": r.get("id"),
            "meetingId": r.get("meeting_id"),
            "storageBucket": r.get("storage_bucket"),
            "storagePath": r.get("storage_path"),
            "publicUrl": r.get("public_url"),
            "status": r.get("status"),
            "durationSeconds": r.get("duration_seconds"),
            "mimeType": r.get("mime_type"),
            "createdAt": r.get("created_at"),
        }
        for r in recordings
    ]
