/**
 * AI Service — Manages AI Q&A based on transcripts.
 */

import { apiClient } from "./api-client";

export interface AIMessage {
  id: string;
  meeting_id: string;
  role: "user" | "assistant";
  content: string;
}

export async function askAI(meetingId: string, question: string) {
  return apiClient.post<{ response: string }>(`/api/ai/ask`, {
    meeting_id: meetingId,
    question,
  });
}

export async function getAIMessages(meetingId: string) {
  return apiClient.get<AIMessage[]>(`/api/ai/messages/${meetingId}`);
}
