import { useState, useEffect, useCallback } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { logInfo, logAdmissionEvent } from "@/shared/lib/logger";
import { UserCheck } from "lucide-react";

const NODE_API_URL =
  (import.meta.env.VITE_NODE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:3001";

interface Request {
  userId: string;
  userName: string;
}

export function AdmissionControlListener({
  meetingId,
  hostId,
  currentUserId,
  onPendingChange,
}: {
  meetingId: string;
  hostId: string;
  currentUserId?: string;
  onPendingChange?: (count: number) => void;
}) {
  const room = useRoomContext();
  const [requests, setRequests] = useState<Request[]>([]);
  const isHost = hostId === currentUserId;

  useEffect(() => {
    onPendingChange?.(requests.length);
  }, [requests.length, onPendingChange]);

  // Listen for JOIN_REQUEST via room events — same pattern as mobile
  useEffect(() => {
    if (!room || !isHost) return;

    const handleData = (
      payload: Uint8Array,
      _participant: any,
      _kind: any,
      topic?: string
    ) => {
      if (topic !== "admission") return;
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === "JOIN_REQUEST") {
          logAdmissionEvent("HOST_RECEIVED_JOIN_REQUEST", meetingId, data.payload.userId, {
            userName: data.payload.userName,
          });
          setRequests((prev) => {
            if (prev.find((r) => r.userId === data.payload.userId)) return prev;
            return [...prev, { userId: data.payload.userId, userName: data.payload.userName }];
          });
        }
      } catch (err) {
        console.error("Failed to parse join request", err);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, isHost, meetingId]);

  const handleApprove = useCallback(
    async (userId: string) => {
      logInfo("Host clicked approve", { meetingId, userId, callerId: currentUserId, hostId });
      try {
        const res = await fetch(`${NODE_API_URL}/api/admission/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId, userId, callerId: currentUserId, hostId }),
        });
        const body = await res.json();
        logInfo("Approve response", { status: res.status, body });
        if (res.ok) {
          setRequests((prev) => prev.filter((r) => r.userId !== userId));
        } else {
          console.error("Approve failed", res.status, body);
        }
      } catch (err) {
        console.error("Failed to approve", err);
      }
    },
    [meetingId, currentUserId, hostId]
  );

  const handleReject = useCallback(
    async (userId: string) => {
      logInfo("Host clicked reject", { meetingId, userId, callerId: currentUserId, hostId });
      try {
        const res = await fetch(`${NODE_API_URL}/api/admission/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId, userId, callerId: currentUserId, hostId }),
        });
        const body = await res.json();
        logInfo("Reject response", { status: res.status, body });
        if (res.ok) {
          setRequests((prev) => prev.filter((r) => r.userId !== userId));
        } else {
          console.error("Reject failed", res.status, body);
        }
      } catch (err) {
        console.error("Failed to reject", err);
      }
    },
    [meetingId, currentUserId, hostId]
  );

  if (!isHost || requests.length === 0) return null;

  return (
    <div className="absolute top-[72px] right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {requests.map((req) => (
        <div
          key={req.userId}
          className="bg-card border border-amber-500/30 rounded-xl shadow-2xl p-4 animate-in slide-in-from-right-4 duration-300"
          style={{ boxShadow: "0 0 0 1px rgba(245,158,11,0.15), 0 8px 32px rgba(0,0,0,0.3)" }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <UserCheck className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{req.userName}</p>
              <p className="text-xs text-muted-foreground">wants to join the meeting</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleReject(req.userId)}
                  className="flex-1 py-1.5 px-3 bg-secondary text-secondary-foreground rounded-md text-xs font-medium hover:bg-secondary/80 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(req.userId)}
                  className="flex-1 py-1.5 px-3 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
