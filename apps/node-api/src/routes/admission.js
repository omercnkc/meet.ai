import { Router } from "express";
import { RoomServiceClient, AccessToken } from "livekit-server-sdk";
import { addRequest, getRequest, removeRequest } from "../services/admission-store.js";
import { logInfo, logWarn, logError, logAdmissionEvent } from "../utils/logger.js";

// Basic in-memory rate limiting
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(userId) {
  const now = Date.now();
  if (!rateLimits.has(userId)) {
    rateLimits.set(userId, [now]);
    return false;
  }
  
  const timestamps = rateLimits.get(userId);
  // Filter out timestamps older than the window
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimits.set(userId, validTimestamps);
    return true;
  }
  
  validTimestamps.push(now);
  rateLimits.set(userId, validTimestamps);
  return false;
}


const router = Router();

const livekitUrl = process.env.LIVEKIT_URL || "ws://localhost:7880";
const livekitApiKey = process.env.LIVEKIT_API_KEY || "devkey";
const livekitApiSecret = process.env.LIVEKIT_API_SECRET || "secret";

const roomService = new RoomServiceClient(livekitUrl, livekitApiKey, livekitApiSecret);

router.post("/request", async (req, res) => {
  const { meetingId, userId, userName } = req.body;

  logInfo(`Incoming POST /request`, { meetingId, userId, userName });

  if (!meetingId || !userId || !userName) {
    logWarn(`Missing required fields in /request`, { meetingId, userId });
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  // Rate limiting check (only for genuinely new requests, not retries)
  const existing = getRequest(meetingId, userId);
  if (!existing && isRateLimited(userId)) {
    logAdmissionEvent('RATE_LIMIT_REJECTED', meetingId, userId, 'N/A', { reason: 'Too many requests' });
    return res.status(429).json({ success: false, error: "Too many requests" });
  }

  // Idempotent: remove any existing pending request and create a fresh one.
  // This handles React StrictMode double-invocation in dev and legitimate retries.
  if (existing) {
    removeRequest(meetingId, userId);
    logAdmissionEvent('DUPLICATE_REFRESHED', meetingId, userId, existing.requestId, { reason: 'Re-request' });
  }

  // 1. Store request in in-memory Map
  const request = addRequest(meetingId, userId, userName);

  // 2. Generate restricted waiting token
  let waitingToken;
  try {
    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: userId,
      name: userName,
    });
    // Restricted token: cannot publish or subscribe to media, but can listen to data
    at.addGrant({ 
      roomJoin: true, 
      room: meetingId, 
      canPublish: false, 
      canSubscribe: false, 
      canPublishData: true 
    });
    waitingToken = await at.toJwt();
    logAdmissionEvent('RESTRICTED_TOKEN_GENERATED', meetingId, userId, request.requestId);
  } catch (err) {
    logError("Failed to generate waiting token", { error: err.message, meetingId, userId });
    return res.status(500).json({ success: false, error: "Internal error" });
  }

  // 3. Immediately respond with the waiting token
  res.status(200).json({ success: true, waitingToken });

  // 4. Send LiveKit DataChannel event to room
  try {
    const payloadStr = JSON.stringify({
      type: "JOIN_REQUEST",
      payload: { userId, userName, meetingId }
    });
    
    // Convert string to Uint8Array for sendData
    const payloadBytes = new TextEncoder().encode(payloadStr);

    // kind: 0 is RELIABLE
    await roomService.sendData(meetingId, payloadBytes, 0, { topic: "admission" });
    logAdmissionEvent('JOIN_REQUEST_SENT', meetingId, userId, request.requestId, { success: true });
  } catch (err) {
    logAdmissionEvent('JOIN_REQUEST_SENT', meetingId, userId, request.requestId, { success: false, error: err.message });
    logError("[admission/request] Failed to send LiveKit DataChannel message", { error: err.message });
  }
});

router.post("/approve", async (req, res) => {
  const { meetingId, userId, callerId, hostId } = req.body;
  logInfo(`Incoming POST /approve`, { meetingId, userId, callerId, hostId });

  if (!meetingId || !userId || !callerId || !hostId) {
    logWarn(`Missing fields in /approve`, { meetingId, userId, callerId, hostId });
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  // Basic validation: ensure the caller claims to be the host
  // Security note: Without a DB connection in this microservice, we rely on the frontend
  // to provide the hostId. For full security, this service should verify the hostId via DB.
  if (callerId !== hostId) {
    return res.status(403).json({ success: false, error: "Forbidden: Only the host can approve requests" });
  }

  // 1. Validate request exists in memory
  const request = getRequest(meetingId, userId);
  if (!request) {
    logWarn(`Join request not found for approve`, { meetingId, userId });
    return res.status(404).json({ success: false, error: "Join request not found" });
  }

  logAdmissionEvent('HOST_APPROVED', meetingId, userId, request.requestId, { hostId });

  try {
    // 2. Send LiveKit DataChannel event
    const payloadStr = JSON.stringify({
      type: "JOIN_APPROVED",
      payload: { userId } // Client will fetch their own token using token-service.ts
    });
    const payloadBytes = new TextEncoder().encode(payloadStr);

    await roomService.sendData(meetingId, payloadBytes, 0, { topic: "admission" });
    logAdmissionEvent('JOIN_APPROVED_SENT', meetingId, userId, request.requestId, { success: true });

    // 3. Remove request from memory
    removeRequest(meetingId, userId);

    res.status(200).json({ success: true });
  } catch (err) {
    logAdmissionEvent('JOIN_APPROVED_SENT', meetingId, userId, request.requestId, { success: false, error: err.message });
    logError("[admission/approve] Error approving request", { error: err.message });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/reject", async (req, res) => {
  const { meetingId, userId, callerId, hostId } = req.body;
  logInfo(`Incoming POST /reject`, { meetingId, userId, callerId, hostId });

  if (!meetingId || !userId || !callerId || !hostId) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  if (callerId !== hostId) {
    return res.status(403).json({ success: false, error: "Forbidden: Only the host can reject requests" });
  }

  const request = getRequest(meetingId, userId);
  if (!request) {
    return res.status(404).json({ success: false, error: "Join request not found" });
  }

  try {
    const payloadStr = JSON.stringify({
      type: "JOIN_REJECTED",
      payload: { userId }
    });
    const payloadBytes = new TextEncoder().encode(payloadStr);

    await roomService.sendData(meetingId, payloadBytes, 0, { topic: "admission" });
    logAdmissionEvent('JOIN_REJECTED_SENT', meetingId, userId, request.requestId, { success: true });

    removeRequest(meetingId, userId);

    res.status(200).json({ success: true });
  } catch (err) {
    logAdmissionEvent('JOIN_REJECTED_SENT', meetingId, userId, request.requestId, { success: false, error: err.message });
    logError("[admission/reject] Error rejecting request", { error: err.message });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
