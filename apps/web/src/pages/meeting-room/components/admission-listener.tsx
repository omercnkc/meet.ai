import { useState } from "react";
import { useDataChannel } from "@livekit/components-react";
import { logInfo, logAdmissionEvent } from "@/shared/lib/logger";

interface Request {
  userId: string;
  userName: string;
}

export function AdmissionControlListener({ 
  meetingId, 
  hostId, 
  currentUserId 
}: { 
  meetingId: string;
  hostId: string;
  currentUserId?: string;
}) {
  const [requests, setRequests] = useState<Request[]>([]);

  useDataChannel("admission", (msg) => {
    if (hostId !== currentUserId) return;
    
    try {
      const decoder = new TextDecoder();
      const payloadStr = decoder.decode(msg.payload);
      const data = JSON.parse(payloadStr);
      
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
        body: JSON.stringify({ meetingId, userId, callerId: currentUserId, hostId })
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
        body: JSON.stringify({ meetingId, userId, callerId: currentUserId, hostId })
      });
      setRequests(prev => prev.filter(r => r.userId !== userId));
    } catch (err) {
      console.error("Failed to reject", err);
    }
  };

  return (
    <div className="absolute top-20 right-6 z-50 flex flex-col gap-2">
      {requests.map(req => (
        <div key={req.userId} className="bg-card border border-border rounded-xl shadow-lg p-4 w-80 animate-in slide-in-from-right-8">
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-semibold text-sm">{req.userName}</p>
              <p className="text-xs text-muted-foreground">wants to join the meeting</p>
            </div>
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => handleReject(req.userId)}
                className="flex-1 py-1.5 px-3 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                Reject
              </button>
              <button 
                onClick={() => handleApprove(req.userId)}
                className="flex-1 py-1.5 px-3 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
