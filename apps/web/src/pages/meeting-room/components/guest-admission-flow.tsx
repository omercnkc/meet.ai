import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LiveKitRoom, useDataChannel } from "@livekit/components-react";
import { LIVEKIT_URL } from "@/shared/lib/livekit/token-service";
import { Meeting } from "@/shared/lib/firebase/services/meetings";
import { User } from "firebase/auth";
import { logInfo, logError, logAdmissionEvent } from "@/shared/lib/logger";

export function GuestAdmissionFlow({ 
  meeting, 
  currentUser,
  onAdmitted
}: { 
  meeting: Meeting, 
  currentUser: User,
  onAdmitted: (token: string) => void
}) {
  const { t } = useTranslation("meeting");
  const [waitingToken, setWaitingToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"requesting" | "waiting" | "rejected" | "timeout" | "error">("requesting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    logInfo("Guest initializing admission request", { meetingId: meeting.id, userId: currentUser.uid });

    const requestAdmission = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/admission/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: meeting.id,
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email || "Guest"
          })
        });
        
        if (!res.ok) throw new Error("Failed to request admission");
        
        const data = await res.json();
        setWaitingToken(data.waitingToken);
        setStatus("waiting");
        logAdmissionEvent("GUEST_RECEIVED_RESTRICTED_TOKEN", meeting.id, currentUser.uid);

        // 30 second timeout fallback UI
        timeoutId = setTimeout(() => {
          logAdmissionEvent("GUEST_REQUEST_TIMEOUT", meeting.id, currentUser.uid);
          setStatus(prev => prev === "waiting" ? "timeout" : prev);
        }, 30000);
        
      } catch (err: any) {
        logError("Failed to request admission", { error: err, meetingId: meeting.id, userId: currentUser.uid });
        const isNetworkError = err instanceof TypeError && err.message.includes("fetch");
        setErrorMessage(
          isNetworkError
            ? "Could not reach the server. Make sure node-api is running on port 3001."
            : err?.message || "An unexpected error occurred."
        );
        setStatus("error");
      }
    };
    
    requestAdmission();

    return () => clearTimeout(timeoutId);
  }, [meeting.id, currentUser, retryKey]);

  if (status === "requesting") {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse font-medium">{t("requestingJoin")}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md w-full p-8 border border-border/40 bg-card rounded-2xl shadow-sm">
          <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive flex items-center justify-center rounded-full mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Connection Error</h1>
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
          <button
            onClick={() => { setStatus("requesting"); setErrorMessage(null); setRetryKey(k => k + 1); }}
            className="mt-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md w-full p-8 border border-border/40 bg-card rounded-2xl shadow-sm">
          <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive flex items-center justify-center rounded-full mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t("requestDeclined")}</h1>
          <p className="text-muted-foreground">{t("requestDeclinedDesc")}</p>
        </div>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md w-full p-8 border border-border/40 bg-card rounded-2xl shadow-sm">
          <div className="mx-auto w-12 h-12 bg-muted/50 text-muted-foreground flex items-center justify-center rounded-full mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t("requestTimedOut")}</h1>
          <p className="text-muted-foreground">{t("requestTimedOutDesc")}</p>
        </div>
      </div>
    );
  }

  if (status === "waiting" && waitingToken) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center text-center p-8">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 mx-auto" />
        <h2 className="text-2xl font-bold mb-2">{t("waitingApproval")}</h2>
        <p className="text-muted-foreground">{t("waitingApprovalDesc")}</p>

        {/* Hidden LiveKit room just to listen for the DataChannel events */}
        <LiveKitRoom
          serverUrl={LIVEKIT_URL}
          token={waitingToken}
          connect={true}
          audio={false}
          video={false}
          className="hidden"
        >
          <AdmissionEventReceiver 
            userId={currentUser.uid} 
            onApproved={(token) => onAdmitted(token)} 
            onRejected={() => setStatus("rejected")} 
          />
        </LiveKitRoom>
      </div>
    );
  }

  return null;
}

function AdmissionEventReceiver({ 
  userId, 
  onApproved, 
  onRejected 
}: { 
  userId: string, 
  onApproved: (token: string) => void, 
  onRejected: () => void 
}) {
  useDataChannel("admission", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      
      if (data.type === "JOIN_APPROVED" && data.payload.userId === userId) {
        logAdmissionEvent("GUEST_RECEIVED_APPROVAL", data.payload.userId, userId);
        onApproved(data.payload.token);
      } else if (data.type === "JOIN_REJECTED" && data.payload.userId === userId) {
        logAdmissionEvent("GUEST_RECEIVED_REJECTION", data.payload.userId, userId);
        onRejected();
      }
    } catch (e) {
      logError("Failed to parse admission event payload", { error: e });
    }
  });

  return null;
}
