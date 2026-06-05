"""
AI Messages API routes.

POST /api/ai/ask                — Ask a question about a meeting transcript
POST /api/ai/messages           — Save an AI Q&A message
GET  /api/ai/messages/{meetingId} — Get AI messages for a meeting
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from app.integrations.firebase_admin import verify_firebase_token
from app.schemas.ai_messages import AiMessageCreateRequest
from app.services.supabase_service import create_ai_message, get_ai_messages_by_meeting
from app.services.ai_service import ask_meeting_question

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Messages"])

_bearer_scheme = HTTPBearer()


# ── Request schema for /ask ──

class AskQuestionRequest(BaseModel):
    """Request body for POST /api/ai/ask."""

    meetingId: str = Field(..., min_length=1, description="Firestore meeting ID.")
    question: str = Field(..., min_length=1, description="User question about the transcript.")
    userName: str = Field(default="User", description="Display name of the current user.")


# ── POST /api/ai/ask ──

@router.post(
    "/ask",
    summary="Ask a question about a meeting transcript",
    responses={
        401: {"description": "Missing or invalid Firebase ID token"},
        400: {"description": "No transcript available"},
        500: {"description": "AI service failure"},
    },
)
async def ask_question_endpoint(
    body: AskQuestionRequest,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
):
    """
    Answer a user question using the meeting transcript via Gemini AI.

    1. Verify Firebase ID token.
    2. Call the AI service with the question and transcript.
    3. Save the Q&A pair to the database.
    4. Return the answer.
    """

    # ── Auth ──
    decoded = await verify_firebase_token(credentials.credentials)
    firebase_uid = decoded.get("uid", "")

    # ── Ask AI ──
    try:
        answer = await ask_meeting_question(
            meeting_id=body.meetingId,
            question=body.question,
            user_name=body.userName,
        )
    except RuntimeError as exc:
        error_msg = str(exc)
        # Distinguish "no transcript" from actual failures
        if "No transcript" in error_msg or "empty" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg,
        )

    # ── Persist Q&A ──
    try:
        row = {
            "meeting_id": body.meetingId,
            "question": body.question,
            "answer": answer,
            "created_by_user_id": firebase_uid,
        }
        record = await create_ai_message(row)
    except Exception:
        logger.exception("[AI Ask] Failed to save Q&A for meeting=%s", body.meetingId)
        # Still return the answer even if persistence fails
        return {
            "question": body.question,
            "answer": answer,
            "meetingId": body.meetingId,
        }

    return {
        "id": record.get("id"),
        "meetingId": record.get("meeting_id"),
        "question": record.get("question"),
        "answer": record.get("answer"),
        "createdByUserId": record.get("created_by_user_id"),
        "createdAt": record.get("created_at"),
    }


# ── POST /api/ai/messages ──

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


# ── GET /api/ai/messages/{meetingId} ──

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
        return []

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
