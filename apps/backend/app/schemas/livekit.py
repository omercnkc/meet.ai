"""
Pydantic schemas for the LiveKit token endpoint.
"""

from pydantic import BaseModel, Field


class TokenRequest(BaseModel):
    """Request body for POST /api/livekit/token."""

    roomName: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="LiveKit room name (typically the Firestore meeting ID).",
    )
    identity: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Participant identity (typically the Firebase user UID).",
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=256,
        description="Participant display name.",
    )
    email: str | None = Field(
        default=None,
        description="Participant email.",
    )


class TokenResponse(BaseModel):
    """Response body for POST /api/livekit/token."""

    token: str = Field(..., description="Signed LiveKit access token (JWT).")
