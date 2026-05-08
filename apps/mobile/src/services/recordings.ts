/**
 * Recordings Service — Manages meeting recordings.
 */

import { apiClient } from "./api-client";

export interface Recording {
  id: string;
  meeting_id: string;
  file_url: string;
  status: string;
}

export async function getRecordingsByMeeting(meetingId: string) {
  return apiClient.get<Recording[]>(`/api/recordings/${meetingId}`);
}
