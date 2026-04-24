"""
Development entry point.

Usage:
    python run.py
"""

import uvicorn
from dotenv import load_dotenv

# Load .env BEFORE importing app (which reads env vars at import time)
load_dotenv()

from app.core.config import settings  # noqa: E402

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
