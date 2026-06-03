import logging
import httpx
from app.integrations.n8n.n8n_config import N8N_WEBHOOK_SECRET

logger = logging.getLogger(__name__)

async def send_n8n_webhook(url: str, payload: dict) -> None:
    """
    Generic webhook POST logic to n8n.
    Attaches authorization token if secret is configured.
    """
    if not url:
        logger.warning("[n8n Client] Webhook URL is not configured. Skipping request.")
        return

    headers = {
        "Content-Type": "application/json"
    }
    if N8N_WEBHOOK_SECRET:
        headers["Authorization"] = f"Bearer {N8N_WEBHOOK_SECRET}"

    logger.info("[n8n Client] Sending webhook POST to %s", url)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=10.0)
            # [DEBUG] log: n8n response status and body
            logger.info("[n8n Client] [DEBUG] n8n response status: %d and body: %s", response.status_code, response.text)
            response.raise_for_status()
    except Exception as exc:
        if isinstance(exc, httpx.HTTPStatusError):
            logger.error("[n8n Client] [DEBUG] n8n response status: %d and body: %s", exc.response.status_code, exc.response.text)
        logger.error("[n8n Client] Webhook request failed: %s", exc)
        raise exc
