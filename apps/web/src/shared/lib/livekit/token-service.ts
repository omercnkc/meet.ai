/**
 * LiveKit Token Service
 *
 * Fetches LiveKit access tokens from the backend API.
 * Pages should import from this file only.
 *
 * Required env vars:
 *   VITE_LIVEKIT_URL              — LiveKit WebSocket URL
 *   VITE_LIVEKIT_TOKEN_ENDPOINT   — Backend token endpoint URL
 */

import type { User } from "firebase/auth"

// ── Config ──────────────────────────────────────────────────────────────

export const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || ""

const TOKEN_ENDPOINT: string =
  import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT || ""

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Obtain a LiveKit access token for the given meeting and user.
 *
 * @param meetingId  Firestore meeting ID, used as the LiveKit room name.
 * @param user       The authenticated Firebase user.
 * @returns          A signed JWT the client passes to LiveKitRoom.
 */
export async function getLiveKitToken(
  meetingId: string,
  user: User
): Promise<string> {
  if (!LIVEKIT_URL) {
    throw new Error("Missing VITE_LIVEKIT_URL environment variable.")
  }

  if (!TOKEN_ENDPOINT) {
    throw new Error(
      "Missing VITE_LIVEKIT_TOKEN_ENDPOINT environment variable. " +
      "The backend must be running and the endpoint URL configured."
    )
  }

  const identity = user.uid
  const name = user.displayName || user.email || "Guest"

  return fetchTokenFromBackend(meetingId, identity, name, user)
}

// ── Backend fetch ───────────────────────────────────────────────────────

/**
 * Calls the backend token endpoint with the Firebase ID token for
 * authentication and the meeting/user details in the request body.
 *
 * POST <TOKEN_ENDPOINT>
 * Authorization: Bearer <firebase-id-token>
 * Content-Type: application/json
 * Body: { "roomName": string, "identity": string, "name": string }
 * Response: { "token": string }
 */
async function fetchTokenFromBackend(
  roomName: string,
  identity: string,
  name: string,
  user: User
): Promise<string> {
  const idToken = await user.getIdToken()

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({ roomName, identity, name }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error")
    throw new Error(`Token endpoint returned ${response.status}: ${text}`)
  }

  const data = await response.json()

  if (!data.token || typeof data.token !== "string") {
    throw new Error(
      "Token endpoint returned invalid response: missing 'token' field."
    )
  }

  return data.token
}
