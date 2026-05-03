/**
 * Recording Upload Service
 *
 * Uploads recorded audio blobs to the backend recording endpoint.
 * All Supabase interaction happens server-side; the frontend only
 * talks to the FastAPI backend using a Firebase Bearer token.
 *
 * Required env:
 *   VITE_LIVEKIT_TOKEN_ENDPOINT — used to derive the backend base URL
 *   (or VITE_API_BASE_URL if added in the future)
 */

import type { User } from "firebase/auth"

// ── Config ──────────────────────────────────────────────────────────────

/**
 * Derive the backend base URL from the existing LiveKit token endpoint.
 * e.g.  http://localhost:8000/api/livekit/token → http://localhost:8000
 */
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

  // Strip the path to get the origin
  try {
    const url = new URL(tokenEndpoint)
    return url.origin
  } catch {
    // Fallback: trim from the last "/api" segment
    const idx = tokenEndpoint.indexOf("/api")
    return idx > 0 ? tokenEndpoint.slice(0, idx) : tokenEndpoint
  }
}

// ── Types ───────────────────────────────────────────────────────────────

export interface UploadRecordingParams {
  meetingId: string
  blob: Blob
  mimeType?: string
  durationSeconds?: number
  user: User
}

export interface RecordingMetadata {
  id: string
  meetingId: string
  storageBucket: string
  storagePath: string
  status: string
  durationSeconds?: number | null
  mimeType?: string | null
  createdAt: string
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Upload a recorded audio blob to the backend.
 *
 * @returns The recording metadata returned by the server.
 */
export async function uploadRecording({
  meetingId,
  blob,
  mimeType = "audio/webm",
  durationSeconds,
  user,
}: UploadRecordingParams): Promise<RecordingMetadata> {
  const baseUrl = getApiBaseUrl()
  const idToken = await user.getIdToken()

  const formData = new FormData()
  formData.append("meetingId", meetingId)
  formData.append("mimeType", mimeType)
  if (durationSeconds !== undefined) {
    formData.append("durationSeconds", String(Math.round(durationSeconds)))
  }

  // Name the file so the backend can recognise the extension
  const ext = mimeType.split("/").pop() || "webm"
  formData.append("file", blob, `recording.${ext}`)

  const response = await fetch(`${baseUrl}/api/recordings/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error")
    throw new Error(`Upload failed (${response.status}): ${text}`)
  }

  return response.json()
}
