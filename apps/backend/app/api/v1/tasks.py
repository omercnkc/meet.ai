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
from firebase_admin import firestore
from livekit.api import LiveKitAPI, ListParticipantsRequest

from app.core.config import settings
from app.integrations.firebase_admin import verify_firebase_token
from app.integrations.n8n import notify_n8n_task_assigned

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
    selectedAssignees: Optional[List[AssigneeSchema]] = Field(default=None, alias="selectedAssignees")
    assignees: Optional[List[AssigneeSchema]] = Field(default=None)

    class Config:
        populate_by_name = True


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

    # ── Resolve Assignees from request body fields ──
    # If the frontend sends `assignees`, use it; if it sends `selectedAssignees`, keep it.
    if "assignees" in body.__fields_set__:
        assignees_list = body.assignees if body.assignees is not None else []
    elif "selectedAssignees" in body.__fields_set__:
        assignees_list = body.selectedAssignees if body.selectedAssignees is not None else []
    else:
        # Fallback if neither was explicitly set in fields_set
        assignees_list = body.assignees if body.assignees is not None else (body.selectedAssignees if body.selectedAssignees is not None else [])
    
    # [DEBUG] log: selected assignees received
    logger.info("[Tasks] [DEBUG] selected assignees received: %s", assignees_list)

    # ── Verify that each selected assignee is a participant of the meeting ──
    if assignees_list:
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

        for assignee in assignees_list:
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
                for a in assignees_list
            ]
        }
        
        # Set deprecated fields for backwards compatibility with existing UI if they only display one assignee
        if assignees_list:
            task_data["assignedToUserId"] = assignees_list[0].userId
            task_data["assignedToName"] = assignees_list[0].name
        else:
            task_data["assignedToUserId"] = None
            task_data["assignedToName"] = None

        _, doc_ref = db.collection("tasks").add(task_data)
        task_id = doc_ref.id
        
        # [DEBUG] log: task created successfully
        logger.info("[Tasks] [DEBUG] task created successfully: ID=%s, meetingId=%s", task_id, body.meetingId)
        
    except Exception as exc:
        logger.exception("[Tasks] Failed to save task to Firestore")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save task: {exc}",
        )

    # ── Trigger n8n webhook ──
    if background_tasks:
        background_tasks.add_task(
            notify_n8n_task_assigned,
            task_id,
            body.meetingId,
            body.title,
            created_at_iso,
            [{"userId": a.userId, "name": a.name, "email": a.email} for a in assignees_list]
        )

    return {
        "id": task_id,
        "meetingId": body.meetingId,
        "title": body.title,
        "status": "open",
        "createdAt": created_at_iso,
        "assignees": [a.dict(by_alias=True) for a in assignees_list]
    }
