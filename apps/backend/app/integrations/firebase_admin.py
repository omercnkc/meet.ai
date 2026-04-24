"""
Firebase Admin SDK initialization and ID token verification.
"""

import os
import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, status

from app.core.config import settings

# Initialize Firebase Admin with project ID only (no service account key needed
# when running on GCP, or when only using ID token verification).
# For local dev, set GOOGLE_APPLICATION_CREDENTIALS env var pointing to a
# service account JSON, or rely on project-ID-only initialization.
if not firebase_admin._apps:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        firebase_admin.initialize_app(
            credentials.Certificate(cred_path),
            options={"projectId": settings.FIREBASE_PROJECT_ID}
        )
    else:
        firebase_admin.initialize_app(
            options={"projectId": settings.FIREBASE_PROJECT_ID}
        )


async def verify_firebase_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token and return the decoded claims.

    Raises HTTPException 401 if the token is invalid or expired.
    """
    try:
        decoded = auth.verify_id_token(id_token)
        return decoded
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase ID token.",
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase ID token has expired.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Firebase token verification failed: {exc}",
        )
