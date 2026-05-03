"""
Pydantic schemas for the AI messages endpoints.
"""

from pydantic import BaseModel, Field


class AiMessageCreateRequest(BaseModel):
    """Request body for POST /api/ai/messages."""

    meetingId: str = Field(..., min_length=1, description="Firestore meeting ID.")
    question: str = Field(..., min_length=1, description="User question.")
    answer: str = Field(..., min_length=1, description="AI-generated answer.")


class AiMessageResponse(BaseModel):
    """Single AI message row returned by the API."""

    id: str
    meeting_id: str = Field(..., alias="meetingId")
    question: str
    answer: str
    created_by_user_id: str | None = Field(None, alias="createdByUserId")
    created_at: str = Field(..., alias="createdAt")

    model_config = {"populate_by_name": True}
