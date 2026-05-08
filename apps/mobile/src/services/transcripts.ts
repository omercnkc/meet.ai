/**
 * Transcripts Service — Manages meeting transcripts.
 */

import { apiClient } from "./api-client";

export interface Transcript {
  id: string;
  meeting_id: string;
  recording_id: string;
  content: string;
}

export async function getTranscriptsByMeeting(meetingId: string) {
  return apiClient.get<Transcript[]>(`/api/transcripts/${meetingId}`);
}

export async function generateTranscript(meetingId: string) {
  return apiClient.post<{ message: string; transcript_id: string }>(
    `/api/transcripts/generate`,
    { meetingId }
  );
}
