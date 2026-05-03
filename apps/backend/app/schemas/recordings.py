"""
Pydantic schemas for the recordings endpoints.
"""

from datetime import datetime
from pydantic import BaseModel, Field


class RecordingResponse(BaseModel):
    """Single recording metadata returned by the API."""

    id: str = Field(..., description="Recording UUID.")
    meeting_id: str = Field(..., alias="meetingId", description="Firestore meeting ID.")
    storage_bucket: str = Field(..., alias="storageBucket")
    storage_path: str = Field(..., alias="storagePath")
    public_url: str | None = Field(None, alias="publicUrl")
    status: str = Field("uploaded")
    duration_seconds: int | None = Field(None, alias="durationSeconds")
    mime_type: str | None = Field(None, alias="mimeType")
    created_at: str = Field(..., alias="createdAt")

    model_config = {"populate_by_name": True}
