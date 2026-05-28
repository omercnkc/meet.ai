import { apiClient } from "./api-client";

export interface AiMessage {
  id: string;
  meetingId: string;
  question: string;
  answer: string;
  createdByUserId?: string;
  createdAt?: string;
}

export async function askAI(meetingId: string, question: string, userName: string): Promise<AiMessage> {
  return apiClient.post<AiMessage>("/api/ai/ask", { meetingId, question, userName });
}

export async function getAIMessages(meetingId: string): Promise<AiMessage[]> {
  try {
    return await apiClient.get<AiMessage[]>(`/api/ai/messages/${meetingId}`);
  } catch (err: any) {
    if (err.status === 404) return [];
    throw err;
  }
}
