/**
 * Transcripts Service — Manages meeting transcripts.
 */

import { apiClient } from "./api-client";

export interface Transcript {
  id: string;
  meetingId: string;
  recordingId?: string | null;
  status: string;
  language?: string | null;
  fullText?: string | null;
  segments?: any[] | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string | null;
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
