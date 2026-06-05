import { Router } from "express";
import { roomService } from "../services/room-service.js";
import { logInfo, logError } from "../utils/logger.js";

// LiveKit proto TrackSource: CAMERA=1, MICROPHONE=2, SCREEN_SHARE=3, SCREEN_SHARE_AUDIO=4
// LiveKit proto TrackType:   AUDIO=0, VIDEO=1, DATA=2
const TrackSource = { CAMERA: 1, MICROPHONE: 2, SCREEN_SHARE: 3, SCREEN_SHARE_AUDIO: 4 };
const TrackType = { AUDIO: 0, VIDEO: 1 };

const router = Router();

function validateHostAction(req, res) {
  const { meetingId, callerId, hostId } = req.body;
  if (!meetingId || !callerId || !hostId) {
    res.status(400).json({ success: false, error: "meetingId, callerId ve hostId zorunludur" });
    return false;
  }
  if (callerId !== hostId) {
    res.status(403).json({ success: false, error: "Yalnızca host bu işlemi yapabilir" });
    return false;
  }
  return true;
}

async function broadcast(meetingId, type, payload) {
  const data = new TextEncoder().encode(JSON.stringify({ type, payload }));
  await roomService.sendData(meetingId, data, 0, { topic: "host-control" });
}

// POST /api/host-controls/kick
router.post("/kick", async (req, res) => {
  if (!validateHostAction(req, res)) return;
  const { meetingId, targetUserId, callerId, reason } = req.body;
  if (!targetUserId || targetUserId === callerId) {
    return res.status(400).json({ success: false, error: "Geçersiz hedef kullanıcı" });
  }
  try {
    // Send DataChannel message FIRST so the participant receives it before being disconnected
    await broadcast(meetingId, "HOST_KICKED", { targetUserId, reason: reason ?? null });
    await roomService.removeParticipant(meetingId, targetUserId);
    logInfo("Participant kicked", { meetingId, targetUserId, by: callerId });
    res.json({ success: true });
  } catch (err) {
    logError("Kick failed", { error: err.message, meetingId, targetUserId });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

// POST /api/host-controls/mute
router.post("/mute", async (req, res) => {
  if (!validateHostAction(req, res)) return;
  const { meetingId, targetUserId, callerId } = req.body;
  if (!targetUserId || targetUserId === callerId) {
    return res.status(400).json({ success: false, error: "Geçersiz hedef kullanıcı" });
  }
  try {
    const participant = await roomService.getParticipant(meetingId, targetUserId);
    const audioTrack = participant.tracks.find(
      t => t.type === TrackType.AUDIO && t.source === TrackSource.MICROPHONE
    );
    if (audioTrack) {
      await roomService.mutePublishedTrack(meetingId, targetUserId, audioTrack.sid, true);
    }
    await broadcast(meetingId, "HOST_MUTED", { targetUserId });
    logInfo("Participant muted", { meetingId, targetUserId, by: callerId, trackFound: !!audioTrack });
    res.json({ success: true });
  } catch (err) {
    logError("Mute failed", { error: err.message, meetingId, targetUserId });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

// POST /api/host-controls/request-unmute
router.post("/request-unmute", async (req, res) => {
  if (!validateHostAction(req, res)) return;
  const { meetingId, targetUserId, callerId } = req.body;
  if (!targetUserId || targetUserId === callerId) {
    return res.status(400).json({ success: false, error: "Geçersiz hedef kullanıcı" });
  }
  try {
    await broadcast(meetingId, "UNMUTE_REQUESTED", { targetUserId });
    logInfo("Unmute requested", { meetingId, targetUserId, by: callerId });
    res.json({ success: true });
  } catch (err) {
    logError("Request unmute failed", { error: err.message, meetingId, targetUserId });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

// POST /api/host-controls/stop-screenshare
router.post("/stop-screenshare", async (req, res) => {
  if (!validateHostAction(req, res)) return;
  const { meetingId, targetUserId, callerId } = req.body;
  if (!targetUserId || targetUserId === callerId) {
    return res.status(400).json({ success: false, error: "Geçersiz hedef kullanıcı" });
  }
  try {
    const participant = await roomService.getParticipant(meetingId, targetUserId);
    const screenTrack = participant.tracks.find(t => t.source === TrackSource.SCREEN_SHARE);
    if (screenTrack) {
      await roomService.mutePublishedTrack(meetingId, targetUserId, screenTrack.sid, true);
    }
    await broadcast(meetingId, "SCREEN_SHARE_STOPPED", { targetUserId });
    logInfo("Screen share stopped", { meetingId, targetUserId, by: callerId, trackFound: !!screenTrack });
    res.json({ success: true });
  } catch (err) {
    logError("Stop screenshare failed", { error: err.message, meetingId, targetUserId });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

// POST /api/host-controls/transfer-host
router.post("/transfer-host", async (req, res) => {
  if (!validateHostAction(req, res)) return;
  const { meetingId, newHostId, callerId } = req.body;
  if (!newHostId || newHostId === callerId) {
    return res.status(400).json({ success: false, error: "Geçersiz yeni host" });
  }
  try {
    await broadcast(meetingId, "HOST_TRANSFERRED", { previousHostId: callerId, newHostId });
    logInfo("Host transferred", { meetingId, from: callerId, to: newHostId });
    res.json({ success: true });
  } catch (err) {
    logError("Transfer host failed", { error: err.message, meetingId });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

// POST /api/host-controls/mute-all
router.post("/mute-all", async (req, res) => {
  if (!validateHostAction(req, res)) return;
  const { meetingId, callerId } = req.body;
  try {
    const participants = await roomService.listParticipants(meetingId);
    const others = participants.filter(p => p.identity !== callerId);
    let mutedCount = 0;
    for (const p of others) {
      const audioTrack = p.tracks.find(
        t => t.type === TrackType.AUDIO && t.source === TrackSource.MICROPHONE
      );
      if (audioTrack) {
        await roomService.mutePublishedTrack(meetingId, p.identity, audioTrack.sid, true);
        mutedCount++;
      }
    }
    // "*" signals all clients to update their UI
    await broadcast(meetingId, "HOST_MUTED", { targetUserId: "*" });
    logInfo("Mute all", { meetingId, mutedCount, by: callerId });
    res.json({ success: true, mutedCount });
  } catch (err) {
    logError("Mute all failed", { error: err.message, meetingId });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

// GET /api/host-controls/participants?meetingId=&callerId=&hostId=
router.get("/participants", async (req, res) => {
  const { meetingId, callerId, hostId } = req.query;
  if (!meetingId || !callerId || !hostId) {
    return res.status(400).json({ success: false, error: "meetingId, callerId ve hostId zorunludur" });
  }
  if (callerId !== hostId) {
    return res.status(403).json({ success: false, error: "Yalnızca host listeleyebilir" });
  }
  try {
    const participants = await roomService.listParticipants(meetingId);
    const list = participants.map(p => ({
      identity: p.identity,
      name: p.name,
      isMicEnabled: p.tracks.some(t => t.source === TrackSource.MICROPHONE && !t.muted),
      isCameraEnabled: p.tracks.some(t => t.source === TrackSource.CAMERA && !t.muted),
      isScreenSharing: p.tracks.some(t => t.source === TrackSource.SCREEN_SHARE && !t.muted),
      joinedAt: Number(p.joinedAt),
    }));
    res.json({ success: true, participants: list });
  } catch (err) {
    logError("List participants failed", { error: err.message, meetingId });
    res.status(500).json({ success: false, error: "İşlem başarısız" });
  }
});

export default router;
