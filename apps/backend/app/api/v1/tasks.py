"""
Tasks API routes.

POST /api/tasks — Create a task, verify assignees are in the meeting, and trigger n8n
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import httpx
from firebase_admin import firestore
from livekit.api import LiveKitAPI, ListParticipantsRequest

from app.core.config import settings
from app.integrations.firebase_admin import verify_firebase_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

_bearer_scheme = HTTPBearer()


def get_firestore_db():
    return firestore.client()


class AssigneeSchema(BaseModel):
    userId: str = Field(..., alias="userId")
    name: str
    email: Optional[str] = None

    class Config:
        populate_by_name = True


class TaskCreateRequest(BaseModel):
    meetingId: str = Field(..., alias="meetingId")
    title: str
    selectedAssignees: List[AssigneeSchema] = Field(default=[], alias="selectedAssignees")

    class Config:
        populate_by_name = True


async def trigger_n8n_webhook(task_id: str, meeting_id: str, title: str, created_at_iso: str, assignees: list):
    webhook_url = settings.N8N_TASK_WEBHOOK_URL
    if not webhook_url:
        logger.info("[Tasks] n8n webhook url not configured. Skipping webhook.")
        return
    logger.info("[Tasks] Triggering n8n webhook for task_id=%s to %s", task_id, webhook_url)
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "taskId": task_id,
                "meetingId": meeting_id,
                "title": title,
                "status": "open",
                "createdAt": created_at_iso,
                "assignees": assignees
            }
            response = await client.post(webhook_url, json=payload, timeout=10.0)
            logger.info("[Tasks] n8n webhook response: %d", response.status_code)
    except Exception as exc:
        logger.error("[Tasks] Failed to trigger n8n webhook: %s", exc)


@router.post(
    "",
    summary="Create a task and trigger n8n webhook",
    responses={
        401: {"description": "Missing or invalid Firebase ID token"},
        400: {"description": "Invalid request or assignee not a participant"},
        500: {"description": "Database or server failure"},
    },
)
async def create_task_endpoint(
    body: TaskCreateRequest,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
):
    # ── Auth ──
    await verify_firebase_token(credentials.credentials)

    # ── Verify meetingId ──
    if not body.meetingId or not body.meetingId.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="meetingId is required.",
        )

    # ── Verify task title ──
    if not body.title or not body.title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="task title is required.",
        )

    # ── Verify that each selected assignee is a participant of the meeting ──
    if body.selectedAssignees:
        lk_api = LiveKitAPI(settings.LIVEKIT_URL, settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
        try:
            res = await lk_api.room.list_participants(ListParticipantsRequest(room=body.meetingId))
            active_ids = {p.identity for p in res.participants}
        except Exception as exc:
            logger.error("[Tasks] Failed to list participants from LiveKit: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to verify meeting participants via LiveKit.",
            )
        finally:
            await lk_api.aclose()

        for assignee in body.selectedAssignees:
            if assignee.userId not in active_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Assignee '{assignee.name}' ({assignee.userId}) is not present in the meeting.",
                )

    # ── Save Task to Firestore ──
    try:
        db = get_firestore_db()
        created_at = datetime.utcnow()
        created_at_iso = created_at.isoformat() + "Z"
        
        # Save compatible structure for existing clients
        task_data = {
            "meetingId": body.meetingId,
            "title": body.title,
            "status": "open",
            "createdAt": created_at,
            "assignees": [
                {
                    "userId": a.userId,
                    "name": a.name,
                    "email": a.email
                }
                for a in body.selectedAssignees
            ]
        }
        
        # Set deprecated fields for backwards compatibility with existing UI if they only display one assignee
        if body.selectedAssignees:
            task_data["assignedToUserId"] = body.selectedAssignees[0].userId
            task_data["assignedToName"] = body.selectedAssignees[0].name
        else:
            task_data["assignedToUserId"] = None
            task_data["assignedToName"] = None

        _, doc_ref = db.collection("tasks").add(task_data)
        task_id = doc_ref.id
        logger.info("[Tasks] Created task_id=%s for meeting_id=%s", task_id, body.meetingId)
        
    except Exception as exc:
        logger.exception("[Tasks] Failed to save task to Firestore")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save task: {exc}",
        )

    # ── Trigger n8n webhook ──
    if background_tasks:
        background_tasks.add_task(
            trigger_n8n_webhook,
            task_id,
            body.meetingId,
            body.title,
            created_at_iso,
            [{"userId": a.userId, "name": a.name, "email": a.email} for a in body.selectedAssignees]
        )

    return {
        "id": task_id,
        "meetingId": body.meetingId,
        "title": body.title,
        "status": "open",
        "createdAt": created_at_iso,
        "assignees": [a.dict(by_alias=True) for a in body.selectedAssignees]
    }
