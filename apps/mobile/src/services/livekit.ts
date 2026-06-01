/**
 * LiveKit Service — Manages LiveKit tokens and connection details.
 */

import { apiClient } from "./api-client";
import { ENV } from "../config/env";

export async function getLiveKitToken(meetingId: string, identity: string, name: string, email?: string | null) {
  const data = await apiClient.post<{ token: string }>(
    `/api/livekit/token`,
    {
      roomName: meetingId,
      identity,
      name,
      email,
    }
  );
  return data.token;
}
