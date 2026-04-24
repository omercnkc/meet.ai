"""
LiveKit API routes.

POST /api/livekit/token — Generate a LiveKit access token for an
authenticated Firebase user.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.schemas.livekit import TokenRequest, TokenResponse
from app.services.livekit_service import generate_livekit_token
from app.integrations.firebase_admin import verify_firebase_token

router = APIRouter(prefix="/api/livekit", tags=["LiveKit"])

# Extracts "Bearer <token>" from the Authorization header
_bearer_scheme = HTTPBearer()


@router.post(
    "/token",
    response_model=TokenResponse,
    summary="Generate a LiveKit access token",
    responses={
        401: {"description": "Missing or invalid Firebase ID token"},
        400: {"description": "Invalid request payload"},
        500: {"description": "Token generation failure"},
    },
)
async def create_livekit_token(
    body: TokenRequest,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
):
    """
    Generate a signed LiveKit access token for the requesting user.

    1. Verifies the Firebase ID token from the Authorization header.
    2. Optionally checks that the requesting user matches the identity claim.
    3. Generates a LiveKit token with room-join grants.
    """

    # ── Step 1: Verify Firebase auth ──
    decoded = await verify_firebase_token(credentials.credentials)
    firebase_uid = decoded.get("uid", "")

    # ── Step 2: Verify the caller is requesting a token for themselves ──
    if body.identity != firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot request a token for a different user.",
        )

    # ── Step 3: Generate the LiveKit token ──
    try:
        token = generate_livekit_token(
            room_name=body.roomName,
            identity=body.identity,
            name=body.name,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate LiveKit token: {exc}",
        )

    return TokenResponse(token=token)
