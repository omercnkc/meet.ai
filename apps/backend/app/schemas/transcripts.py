"""
Pydantic schemas for the transcripts endpoints.
"""

from typing import Any
from pydantic import BaseModel, Field


class TranscriptCreateRequest(BaseModel):
    """Request body for POST /api/transcripts."""

    meetingId: str = Field(..., min_length=1, description="Firestore meeting ID.")
    recordingId: str | None = Field(None, description="Optional recording UUID.")
    status: str = Field("completed", description="Transcript status.")
    language: str = Field("tr", description="Language code.")
    fullText: str | None = Field(None, description="Full transcript text.")
    segments: list[Any] | None = Field(None, description="Transcript segments (JSONB).")


class TranscriptResponse(BaseModel):
    """Single transcript row returned by the API."""

    id: str
    meeting_id: str = Field(..., alias="meetingId")
    recording_id: str | None = Field(None, alias="recordingId")
    status: str
    language: str | None = None
    full_text: str | None = Field(None, alias="fullText")
    segments: list[Any] | None = None
    error_message: str | None = Field(None, alias="errorMessage")
    created_at: str = Field(..., alias="createdAt")
    updated_at: str = Field(..., alias="updatedAt")

    model_config = {"populate_by_name": True}
