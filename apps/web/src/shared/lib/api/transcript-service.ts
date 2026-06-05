/**
 * Transcript Service
 *
 * Calls backend endpoints for transcript generation and retrieval.
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

export interface TranscriptRecord {
  id: string
  meetingId: string
  recordingId?: string | null
  status: string
  language?: string | null
  fullText?: string | null
  segments?: any[] | null
  errorMessage?: string | null
  createdAt: string
  updatedAt?: string | null
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Trigger transcript generation for a meeting's latest recording.
 *
 * POST /api/transcripts/generate
 */
export async function generateTranscript(
  meetingId: string,
  user: User
): Promise<TranscriptRecord> {
  const baseUrl = getApiBaseUrl()
  const idToken = await user.getIdToken()

  const response = await fetch(`${baseUrl}/api/transcripts/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ meetingId }),
  })

  if (!response.ok || response.status === 202) {
    const data = await response.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(data.detail || `Transcript generation failed (${response.status})`)
  }

  return response.json()
}

/**
 * Fetch existing transcripts for a meeting.
 *
 * GET /api/transcripts/{meetingId}
 */
export async function getTranscripts(
  meetingId: string,
  user: User
): Promise<TranscriptRecord[]> {
  const baseUrl = getApiBaseUrl()
  const idToken = await user.getIdToken()

  const response = await fetch(`${baseUrl}/api/transcripts/${meetingId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })

  if (response.status === 404 || response.status === 202) {
    return [] // No transcripts yet
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(data.detail || `Failed to fetch transcripts (${response.status})`)
  }

  return response.json()
}
