/**
 * AI Q&A Service
 *
 * Calls backend endpoints for AI-powered meeting transcript Q&A.
 * All AI interaction is server-side only (Gemini API).
 */

import type { User } from "firebase/auth"

// ── Config ──────────────────────────────────────────────────────────────

function getApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL
  if (explicit) return explicit.replace(/\/+$/, "")

  const tokenEndpoint: string = import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT || ""
  if (!tokenEndpoint) {
    throw new Error(
      "Cannot determine backend URL. Set VITE_API_BASE_URL or " +
        "VITE_LIVEKIT_TOKEN_ENDPOINT."
    )
  }

  try {
    const url = new URL(tokenEndpoint)
    return url.origin
  } catch {
    const idx = tokenEndpoint.indexOf("/api")
    return idx > 0 ? tokenEndpoint.slice(0, idx) : tokenEndpoint
  }
}

// ── Types ───────────────────────────────────────────────────────────────

export interface AiMessage {
  id?: string
  meetingId: string
  question: string
  answer: string
  createdByUserId?: string
  createdAt?: string
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Ask a question about a meeting transcript.
 *
 * POST /api/ai/ask
 */
export async function askMeetingQuestion(
  meetingId: string,
  question: string,
  user: User
): Promise<AiMessage> {
  const baseUrl = getApiBaseUrl()
  const idToken = await user.getIdToken()

  const userName = user.displayName || user.email?.split("@")[0] || "User"

  const response = await fetch(`${baseUrl}/api/ai/ask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ meetingId, question, userName }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(data.detail || `AI Q&A failed (${response.status})`)
  }

  return response.json()
}

/**
 * Fetch existing AI messages for a meeting.
 *
 * GET /api/ai/messages/{meetingId}
 */
export async function getAiMessages(
  meetingId: string,
  user: User
): Promise<AiMessage[]> {
  const baseUrl = getApiBaseUrl()
  const idToken = await user.getIdToken()

  const response = await fetch(`${baseUrl}/api/ai/messages/${meetingId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })

  if (response.status === 404) {
    return [] // No messages yet
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(data.detail || `Failed to fetch AI messages (${response.status})`)
  }

  return response.json()
}
