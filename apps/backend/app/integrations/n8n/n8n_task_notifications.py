import logging
from app.integrations.n8n.n8n_config import N8N_TASK_WEBHOOK_URL
from app.integrations.n8n.n8n_client import send_n8n_webhook
from app.integrations.n8n.n8n_types import N8nTaskAssignedPayload, N8nTaskDetail, N8nAssignee

logger = logging.getLogger(__name__)

async def notify_n8n_task_assigned(
    task_id: str,
    meeting_id: str,
    title: str,
    created_at_iso: str,
    assignees: list
) -> None:
    """
    Builds the task_assigned payload, validates assignees,
    and calls the generic n8n client webhook sender.
    """
    # [DEBUG] log: n8n notification function started
    logger.info("[n8n Notification] [DEBUG] n8n notification function started for task_id: %s", task_id)
    
    # [DEBUG] log: n8n webhook URL loaded
    logger.info("[n8n Notification] [DEBUG] n8n webhook URL loaded: %s", N8N_TASK_WEBHOOK_URL)

    if not N8N_TASK_WEBHOOK_URL:
        logger.warning("[n8n Notification] skipped: N8N_TASK_WEBHOOK_URL is not configured.")
        return

    # 7. If assignees is empty, do not call n8n and log a warning
    if not assignees:
        logger.warning(
            "[n8n Notification] skipped: assignees list is empty or missing for task %s.",
            task_id
        )
        return

    # 6. If an assignee does not have an email, skip that assignee and log a warning
    valid_assignees = []
    for a in assignees:
        email = a.get("email")
        if not email or not email.strip():
            logger.warning(
                "[n8n Notification] skipped assignee '%s' (%s): missing email address.",
                a.get("name"),
                a.get("userId")
            )
            continue
        
        # Pydantic validation
        try:
            assignee_obj = N8nAssignee(
                userId=a.get("userId"),
                name=a.get("name"),
                email=email.strip()
            )
            valid_assignees.append(assignee_obj)
        except Exception as exc:
            logger.warning(
                "[n8n Notification] skipped assignee '%s' (%s) due to validation error: %s",
                a.get("name"),
                a.get("userId"),
                exc
            )

    if not valid_assignees:
        logger.warning(
            "[n8n Notification] skipped: no assignees with valid email addresses found for task %s.",
            task_id
        )
        return

    # Build Pydantic payload
    try:
        task_detail = N8nTaskDetail(
            id=task_id,
            title=title,
            status="open",
            createdAt=created_at_iso
        )
        payload_obj = N8nTaskAssignedPayload(
            meetingId=meeting_id,
            task=task_detail,
            assignees=valid_assignees
        )
        # Convert to dictionary with correct alias/naming
        payload = payload_obj.dict(by_alias=True)
    except Exception as exc:
        logger.error("[n8n Notification] Failed to build task payload: %s", exc)
        return

    try:
        await send_n8n_webhook(N8N_TASK_WEBHOOK_URL, payload)
        logger.info("[n8n Notification] Webhook success: task assignment notification sent for task %s.", task_id)
    except Exception as exc:
        logger.error(
            "[n8n Notification] Webhook failure: task assignment notification failed to send for task %s: %s",
            task_id,
            exc
        )
