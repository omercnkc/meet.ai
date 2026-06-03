import { useState, useEffect } from "react";
import { useDataChannel } from "@livekit/components-react";
import { logInfo, logAdmissionEvent } from "@/shared/lib/logger";
import { UserCheck } from "lucide-react";

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
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    onPendingChange?.(requests.length);
  }, [requests.length, onPendingChange]);

  useDataChannel("admission", (msg) => {
    if (hostId !== currentUserId) return;

    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));

      if (data.type === "JOIN_REQUEST") {
        logAdmissionEvent("HOST_RECEIVED_JOIN_REQUEST", meetingId, data.payload.userId, { userName: data.payload.userName });
        setRequests(prev => {
          if (prev.find(r => r.userId === data.payload.userId)) return prev;
          return [...prev, { userId: data.payload.userId, userName: data.payload.userName }];
        });
      }
    } catch (err) {
      console.error("Failed to parse join request", err);
    }
  });

  if (hostId !== currentUserId || requests.length === 0) return null;

  const handleApprove = async (userId: string) => {
    logInfo("Host clicked approve", { meetingId, userId, callerId: currentUserId });
    try {
      await fetch("http://localhost:3001/api/admission/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, userId, callerId: currentUserId, hostId }),
      });
      setRequests(prev => prev.filter(r => r.userId !== userId));
    } catch (err) {
      console.error("Failed to approve", err);
    }
  };

  const handleReject = async (userId: string) => {
    logInfo("Host clicked reject", { meetingId, userId, callerId: currentUserId });
    try {
      await fetch("http://localhost:3001/api/admission/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, userId, callerId: currentUserId, hostId }),
      });
      setRequests(prev => prev.filter(r => r.userId !== userId));
    } catch (err) {
      console.error("Failed to reject", err);
    }
  };

  return (
    <div className="absolute top-[72px] right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {requests.map(req => (
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
