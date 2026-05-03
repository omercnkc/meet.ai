import { Router } from "express";
import { getTodosByMeetingId, getParticipantsByMeetingId } from "../services/db.js";
import { triggerN8nWebhook } from "../services/n8n.js";

const router = Router();

router.post("/end", async (req, res) => {
  const { meetingId } = req.body;

  if (!meetingId || typeof meetingId !== "string") {
    return res.status(400).json({ success: false, error: "meetingId is required" });
  }

  try {
    const [todos, emails] = await Promise.all([
      getTodosByMeetingId(meetingId),
      getParticipantsByMeetingId(meetingId),
    ]);

    await triggerN8nWebhook({ meetingId, emails, todos });

    return res.json({ success: true });
  } catch (err) {
    console.error("[meeting/end]", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
