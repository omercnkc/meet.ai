"""
AI Messages API routes.

POST /api/ai/messages           — Save an AI Q&A message
GET  /api/ai/messages/{meetingId} — Get AI messages for a meeting
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.integrations.firebase_admin import verify_firebase_token
from app.schemas.ai_messages import AiMessageCreateRequest
from app.services.supabase_service import create_ai_message, get_ai_messages_by_meeting

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Messages"])

_bearer_scheme = HTTPBearer()


@router.post(
    "/messages",
    summary="Save an AI Q&A message",
    responses={
        401: {"description": "Missing or invalid Firebase ID token"},
        400: {"description": "Invalid request"},
        500: {"description": "Database failure"},
    },
)
async def create_ai_message_endpoint(
    body: AiMessageCreateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
):
    """
    Insert an AI Q&A message into meeting_ai_messages.

    1. Verify Firebase ID token.
    2. Extract user UID from token.
    3. Insert row.
    4. Return the saved message.
    """

    # ── Auth ──
    decoded = await verify_firebase_token(credentials.credentials)
    firebase_uid = decoded.get("uid", "")

    # ── Build row ──
    row = {
        "meeting_id": body.meetingId,
        "question": body.question,
        "answer": body.answer,
        "created_by_user_id": firebase_uid,
    }

    try:
        record = await create_ai_message(row)
    except Exception as exc:
        logger.exception("[AI Messages] Insert failed for meeting=%s", body.meetingId)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save AI message.",
        )

    return {
        "id": record.get("id"),
        "meetingId": record.get("meeting_id"),
        "question": record.get("question"),
        "answer": record.get("answer"),
        "createdByUserId": record.get("created_by_user_id"),
        "createdAt": record.get("created_at"),
    }


@router.get(
    "/messages/{meetingId}",
    summary="Get AI messages for a meeting",
    responses={
        401: {"description": "Missing or invalid Firebase ID token"},
        404: {"description": "No AI messages found"},
    },
)
async def get_ai_messages_endpoint(
    meetingId: str,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
):
    """Return AI messages for the given meeting ID, ordered by creation time."""

    # ── Auth ──
    await verify_firebase_token(credentials.credentials)

    try:
        messages = await get_ai_messages_by_meeting(meetingId)
    except Exception as exc:
        logger.exception("[AI Messages] Query failed for meeting=%s", meetingId)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch AI messages.",
        )

    if not messages:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI messages found for this meeting.",
        )

    return [
        {
            "id": m.get("id"),
            "meetingId": m.get("meeting_id"),
            "question": m.get("question"),
            "answer": m.get("answer"),
            "createdByUserId": m.get("created_by_user_id"),
            "createdAt": m.get("created_at"),
        }
        for m in messages
    ]
