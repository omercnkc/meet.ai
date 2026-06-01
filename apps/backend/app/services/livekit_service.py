"""
LiveKit token generation service.

Uses the livekit-api Python SDK to create signed access tokens
with appropriate room-join grants.
"""

import json
import logging
from datetime import timedelta

from livekit.api import AccessToken, VideoGrants

from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_livekit_token(
    room_name: str,
    identity: str,
    name: str,
    email: str | None = None,
) -> str:
    """
    Generate a signed LiveKit access token.

    Args:
        room_name: The LiveKit room to grant access to.
        identity:  Unique participant identity (Firebase UID).
        name:      Human-readable display name.
        email:     Optional participant email address.

    Returns:
        A signed JWT string the client passes to LiveKitRoom.

    Raises:
        ValueError: If room_name or identity is empty.
    """
    # ── Input validation ──
    if not room_name or not room_name.strip():
        raise ValueError("room_name must not be empty")
    if not identity or not identity.strip():
        raise ValueError("identity must not be empty")
    if not name or not name.strip():
        name = identity  # fallback to uid

    # ── Debug logs (safe: no secret, no full token) ──
    logger.info(
        "[LiveKit] Generating token  room=%s  identity=%s  name=%s",
        room_name, identity, name,
    )

    grants = VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True,
    )

    logger.info(
        "[LiveKit] Grants  room_join=%s  room=%s  can_publish=%s  can_subscribe=%s",
        grants.room_join, grants.room, grants.can_publish, grants.can_subscribe,
    )

    # ── Build token using the SDK's fluent builder API ──
    token_builder = (
        AccessToken(
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
        )
        .with_identity(identity)
        .with_name(name)
    )

    if email:
        metadata = json.dumps({"email": email})
        token_builder = token_builder.with_metadata(metadata)

    jwt_token = (
        token_builder
        .with_grants(grants)
        .with_ttl(timedelta(hours=6))
        .to_jwt()
    )

    logger.info("[LiveKit] Token generated successfully (length=%d)", len(jwt_token))

    return jwt_token
