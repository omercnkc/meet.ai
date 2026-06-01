"""
Meet.AI — FastAPI Backend Configuration.

Loads all required environment variables with validation.
"""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    # LiveKit
    LIVEKIT_API_KEY: str
    LIVEKIT_API_SECRET: str
    LIVEKIT_URL: str

    # Firebase
    FIREBASE_PROJECT_ID: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_RECORDINGS_BUCKET: str = "meet-recordings"

    # Gemini
    GEMINI_API_KEY: str | None = None
    GEMINI_TRANSCRIPTION_MODEL: str = "gemini-2.5-flash"

    # n8n
    N8N_TASK_WEBHOOK_URL: str | None = None

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: list[str] | None = None


def load_settings() -> Settings:
    """Load and validate settings from environment variables."""

    def _require(key: str) -> str:
        value = os.getenv(key)
        if not value:
            raise EnvironmentError(f"Missing required environment variable: {key}")
        return value

    cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    cors_origins = [o.strip() for o in cors_raw.split(",") if o.strip()]

    return Settings(
        LIVEKIT_API_KEY=_require("LIVEKIT_API_KEY"),
        LIVEKIT_API_SECRET=_require("LIVEKIT_API_SECRET"),
        LIVEKIT_URL=_require("LIVEKIT_URL"),
        FIREBASE_PROJECT_ID=_require("FIREBASE_PROJECT_ID"),
        SUPABASE_URL=_require("SUPABASE_URL"),
        SUPABASE_SERVICE_ROLE_KEY=_require("SUPABASE_SERVICE_ROLE_KEY"),
        SUPABASE_RECORDINGS_BUCKET=os.getenv("SUPABASE_RECORDINGS_BUCKET", "meet-recordings"),
        GEMINI_API_KEY=os.getenv("GEMINI_API_KEY"),
        GEMINI_TRANSCRIPTION_MODEL=os.getenv("GEMINI_TRANSCRIPTION_MODEL", "gemini-2.5-flash"),
        N8N_TASK_WEBHOOK_URL=os.getenv("N8N_TASK_WEBHOOK_URL"),
        HOST=os.getenv("HOST", "0.0.0.0"),
        PORT=int(os.getenv("PORT", "8000")),
        CORS_ORIGINS=cors_origins,
    )


settings = load_settings()
