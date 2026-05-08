/**
 * LiveKit Service — Manages LiveKit tokens and connection details.
 */

import { apiClient } from "./api-client";
import { ENV } from "../config/env";

export async function getLiveKitToken(meetingId: string) {
  const data = await apiClient.get<{ token: string }>(
    `/api/livekit/token?room=${meetingId}`
  );
  return data.token;
}
