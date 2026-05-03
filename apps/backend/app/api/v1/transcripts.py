"""
Transcript API routes.

POST /api/transcripts             — Create a transcript record
POST /api/transcripts/generate    — Generate transcript from latest recording
GET  /api/transcripts/{meetingId} — Get transcripts for a meeting
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.integrations.firebase_admin import verify_firebase_token
from app.schemas.transcripts import TranscriptCreateRequest, TranscriptGenerateRequest
from app.services.supabase_service import create_transcript, get_transcripts_by_meeting
from app.services.transcription_service import transcribe_meeting

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transcripts", tags=["Transcripts"])

_bearer_scheme = HTTPBearer()


@router.post(
    "",
    summary="Create a transcript record",
    responses={
        401: {"description": "Missing or invalid Firebase ID token"},
        400: {"description": "Invalid request"},
        500: {"description": "Database failure"},
    },
)
async def create_transcript_endpoint(
    body: TranscriptCreateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
):
    """
    Insert a transcript row into meeting_transcripts.

    1. Verify Firebase ID token.
    2. Validate inputs.
    3. Insert row.
    4. Return the transcript record.
    """

    # ── Auth ──
    await verify_firebase_token(credentials.credentials)

    # ── Build row ──
    row = {
        "meeting_id": body.meetingId,
        "status": body.status,
        "language": body.language,
    }
    if body.recordingId:
        row["recording_id"] = body.recordingId
    if body.fullText is not None:
        row["full_text"] = body.fullText
    if body.segments is not None:
        row["segments"] = body.segments

    try:
        record = await create_transcript(row)
    except Exception as exc:
        logger.exception("[Transcripts] Insert failed for meeting=%s", body.meetingId)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create transcript.",
        )

    return {
        "id": record.get("id"),
        "meetingId": record.get("meeting_id"),
        "recordingId": record.get("recording_id"),
        "status": record.get("status"),
        "language": record.get("language"),
        "fullText": record.get("full_text"),
        "segments": record.get("segments"),
        "errorMessage": record.get("error_message"),
        "createdAt": record.get("created_at"),
        "updatedAt": record.get("updated_at"),
    }


@router.post(
    "/generate",
    summary="Generate transcript from latest recording",
    responses={
        401: {"description": "Missing or invalid Firebase ID token"},
        400: {"description": "Invalid request"},
        404: {"description": "No recording found for this meeting"},
        500: {"description": "Transcription or database failure"},
    },
)
async def generate_transcript_endpoint(
    body: TranscriptGenerateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
):
    """
    Generate a transcript from the latest recording for a meeting.

    1. Verify Firebase ID token.
    2. Call transcription service (download → Gemini → save).
    3. Return the transcript record.
    """

    # ── Auth ──
    await verify_firebase_token(credentials.credentials)

    try:
        record = await transcribe_meeting(body.meetingId)
    except RuntimeError as exc:
        # Determine status code from error context
        msg = str(exc)
        if "No recordings found" in msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=msg,
            )
        logger.exception(
            "[Transcripts] Generation failed for meeting=%s", body.meetingId,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=msg,
        )
    except Exception as exc:
        logger.exception(
            "[Transcripts] Unexpected error for meeting=%s", body.meetingId,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transcript generation failed. Please try again.",
        )

    return {
        "id": record.get("id"),
        "meetingId": record.get("meeting_id"),
        "recordingId": record.get("recording_id"),
        "status": record.get("status"),
        "language": record.get("language"),
        "fullText": record.get("full_text"),
        "segments": record.get("segments"),
        "errorMessage": record.get("error_message"),
        "createdAt": record.get("created_at"),
        "updatedAt": record.get("updated_at"),
    }


@router.get(
    "/{meetingId}",
    summary="Get transcripts for a meeting",
    responses={
        401: {"description": "Missing or invalid Firebase ID token"},
        404: {"description": "No transcripts found"},
    },
)
async def get_transcripts_endpoint(
    meetingId: str,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
):
    """Return transcripts for the given meeting ID."""

    # ── Auth ──
    await verify_firebase_token(credentials.credentials)

    try:
        transcripts = await get_transcripts_by_meeting(meetingId)
    except Exception as exc:
        logger.exception("[Transcripts] Query failed for meeting=%s", meetingId)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch transcripts.",
        )

    if not transcripts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No transcripts found for this meeting.",
        )

    return [
        {
            "id": t.get("id"),
            "meetingId": t.get("meeting_id"),
            "recordingId": t.get("recording_id"),
            "status": t.get("status"),
            "language": t.get("language"),
            "fullText": t.get("full_text"),
            "segments": t.get("segments"),
            "errorMessage": t.get("error_message"),
            "createdAt": t.get("created_at"),
            "updatedAt": t.get("updated_at"),
        }
        for t in transcripts
    ]
