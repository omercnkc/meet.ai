"""
Meet.AI — FastAPI Application Factory.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.livekit import router as livekit_router
from app.api.v1.recordings import router as recordings_router
from app.api.v1.transcripts import router as transcripts_router
from app.api.v1.ai_messages import router as ai_messages_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Meet.AI API",
        description="Backend API for Meet.AI — AI-powered meeting platform.",
        version="0.1.0",
    )

    # ── CORS ──
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ──
    app.include_router(livekit_router)
    app.include_router(recordings_router)
    app.include_router(transcripts_router)
    app.include_router(ai_messages_router)

    # ── Health check ──
    @app.get("/health", tags=["System"])
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
