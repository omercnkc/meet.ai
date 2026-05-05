"""
AI Q&A Service.

Uses Google Gemini to answer user questions based on meeting transcripts.
Implements strict transcript-only answering with a predefined system prompt.
"""

import logging
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.services.supabase_service import (
    get_transcripts_by_meeting,
    get_ai_messages_by_meeting,
)

logger = logging.getLogger(__name__)


def _get_gemini_client() -> genai.Client:
    """Return a Gemini client. Raises if the API key is not configured."""
    if not settings.GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. "
            "Set it in the backend .env file."
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _build_system_prompt(user_name: str) -> str:
    """Build the AI meeting assistant system prompt."""
    return f"""You are an AI meeting assistant.

Your job is to answer questions strictly based on the provided meeting transcript.

--- BEHAVIOR RULES ---

1. You ONLY use the given transcript as your knowledge source.
2. You MUST NOT use any external knowledge, assumptions, or general world knowledge.
3. If the answer is not explicitly or clearly supported by the transcript, you must refuse.

--- REFUSAL RULE ---

If a question is unrelated to the transcript or cannot be answered from it, respond with:

"I'm sorry, but I can only answer questions based on this meeting's transcript."

Do not provide any additional explanation.

--- ANSWERING STYLE ---

- Be clear and concise
- Use natural language
- When possible, refer to what was said in the meeting
- Do not hallucinate or infer missing details

--- CONTEXT AWARENESS ---

The transcript may contain multiple speakers and timestamps.
Use this information when relevant.

--- GREETING BEHAVIOR ---

When the conversation starts (or if the user has not asked a question yet):

- Greet the user by their name: {user_name}
- Welcome them warmly
- Briefly explain that you can help them understand the meeting
- Ask how you can assist

Example:

"Hi {user_name}, welcome! I can help you understand and analyze this meeting transcript. You can ask me about decisions, key points, tasks, or anything discussed. How can I assist you today?"

--- STRICT MODE ---

Never break these rules under any circumstance."""


async def ask_meeting_question(
    meeting_id: str,
    question: str,
    user_name: str,
) -> str:
    """
    Answer a user question based on the meeting transcript.

    Steps:
        1. Fetch the latest completed transcript for the meeting.
        2. Fetch previous Q&A conversation history.
        3. Build a Gemini conversation with system prompt + transcript + history.
        4. Send the user question and return the AI answer.

    Raises RuntimeError with a user-friendly message on failure.
    """

    # ── 1. Fetch latest transcript ──
    transcripts = await get_transcripts_by_meeting(meeting_id)
    completed = [t for t in transcripts if t.get("status") == "completed"]

    if not completed:
        raise RuntimeError(
            "No transcript available for this meeting. "
            "Please generate a transcript first."
        )

    transcript_text = completed[0].get("full_text", "")
    if not transcript_text or not transcript_text.strip():
        raise RuntimeError(
            "The transcript for this meeting is empty. "
            "Please try generating it again."
        )

    # ── 2. Fetch conversation history ──
    try:
        history_messages = await get_ai_messages_by_meeting(meeting_id)
    except Exception:
        history_messages = []

    # ── 3. Build Gemini conversation ──
    client = _get_gemini_client()
    model = settings.GEMINI_TRANSCRIPTION_MODEL  # reuse the same model

    system_prompt = _build_system_prompt(user_name)

    # Build contents: system instruction, transcript context, history, then question
    contents: list[types.Content] = []

    # Transcript as initial context from the "user"
    contents.append(
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(
                    text=f"Here is the meeting transcript:\n\n{transcript_text}"
                ),
            ],
        )
    )

    # Acknowledge transcript from the "model"
    contents.append(
        types.Content(
            role="model",
            parts=[
                types.Part.from_text(
                    text="I've received the meeting transcript. I'll answer your questions based solely on this content. How can I help you?"
                ),
            ],
        )
    )

    # Add conversation history
    for msg in history_messages:
        q = msg.get("question", "")
        a = msg.get("answer", "")
        if q:
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=q)],
                )
            )
        if a:
            contents.append(
                types.Content(
                    role="model",
                    parts=[types.Part.from_text(text=a)],
                )
            )

    # Add the current question
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=question)],
        )
    )

    # ── 4. Call Gemini ──
    logger.info(
        "[AI Q&A] Asking question  meeting=%s  question_len=%d  history=%d",
        meeting_id,
        len(question),
        len(history_messages),
    )

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )
    except Exception as exc:
        error_msg = str(exc)
        logger.error("[AI Q&A] Gemini call failed: %s", error_msg)
        if "503" in error_msg or "UNAVAILABLE" in error_msg or "high demand" in error_msg:
            raise RuntimeError(
                "The AI service is currently experiencing high demand. "
                "Please try again in a few moments."
            ) from exc
        raise RuntimeError(
            "Failed to get an answer from the AI. Please try again."
        ) from exc

    answer = response.text
    if not answer or not answer.strip():
        raise RuntimeError("The AI returned an empty response. Please try again.")

    logger.info("[AI Q&A] Answer generated  chars=%d", len(answer))
    return answer.strip()
