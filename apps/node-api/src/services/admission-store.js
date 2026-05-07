import crypto from "crypto";
import { logAdmissionEvent } from "../utils/logger.js";

export const admissionStore = new Map();
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
export function addRequest(meetingId, userId, userName) {
  if (!admissionStore.has(meetingId)) {
    admissionStore.set(meetingId, new Map());
  }
  const roomRequests = admissionStore.get(meetingId);
  
  const request = {
    requestId: crypto.randomUUID(),
    userId,
    userName,
    meetingId,
    status: 'pending',
    createdAt: Date.now()
  };
  
  roomRequests.set(userId, request);
  logAdmissionEvent('REQUEST_STORED', meetingId, userId, request.requestId, { userName });
  
  // Auto-cleanup after timeout
  setTimeout(() => {
    const currentReq = getRequest(meetingId, userId);
    if (currentReq && currentReq.requestId === request.requestId) {
      removeRequest(meetingId, userId);
      logAdmissionEvent('REQUEST_EXPIRED', meetingId, userId, request.requestId, { reason: 'timeout' });
    }
  }, REQUEST_TIMEOUT_MS);

  return request;
}

export function getRequest(meetingId, userId) {
  const roomRequests = admissionStore.get(meetingId);
  return roomRequests ? roomRequests.get(userId) : null;
}

export function removeRequest(meetingId, userId) {
  const roomRequests = admissionStore.get(meetingId);
  if (roomRequests) {
    roomRequests.delete(userId);
    if (roomRequests.size === 0) {
      admissionStore.delete(meetingId);
    }
  }
}
