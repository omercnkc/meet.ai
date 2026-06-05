import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Room, RoomEvent } from "livekit-client";
import { LIVEKIT_URL } from "@/shared/lib/livekit/token-service";
import { Meeting } from "@/shared/lib/firebase/services/meetings";
import { User } from "firebase/auth";
import { logError, logAdmissionEvent } from "@/shared/lib/logger";

const NODE_API_URL =
  (import.meta.env.VITE_NODE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:3001";

export function GuestAdmissionFlow({
  meeting,
  currentUser,
  onAdmitted,
}: {
  meeting: Meeting;
  currentUser: User;
  onAdmitted: (token: string) => void;
}) {
  const { t } = useTranslation("meeting");
  const [status, setStatus] = useState<"requesting" | "waiting" | "rejected" | "timeout" | "error">(
    "requesting"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Keep latest onAdmitted in a ref so the effect closure is always current
  const onAdmittedRef = useRef(onAdmitted);
  useEffect(() => {
    onAdmittedRef.current = onAdmitted;
  }, [onAdmitted]);

  useEffect(() => {
    let alive = true;
    let restrictedRoom: Room | null = null;
    let timeoutId: ReturnType<typeof setTimeout>;

    const run = async () => {
      // ── 1. Send admission request ──────────────────────────────────────
      let waitingToken: string;
      try {
        const res = await fetch(`${NODE_API_URL}/api/admission/request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: meeting.id,
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email || "Guest",
          }),
        });
        if (!res.ok) throw new Error(`Admission request failed (${res.status})`);
        const data = await res.json();
        waitingToken = data.waitingToken;
        logAdmissionEvent("GUEST_RECEIVED_RESTRICTED_TOKEN", meeting.id, currentUser.uid);
      } catch (err: any) {
        if (!alive) return;
        const isNetworkError = err instanceof TypeError && err.message.includes("fetch");
        setErrorMessage(
          isNetworkError
            ? `Could not reach the server. Make sure node-api is running (${NODE_API_URL}).`
            : err?.message || "An unexpected error occurred."
        );
        setStatus("error");
        return;
      }

      if (!alive) return;

      // ── 2. Create room & register handler BEFORE connecting (same as mobile) ──
      restrictedRoom = new Room();

      restrictedRoom.on(
        RoomEvent.DataReceived,
        (payload: Uint8Array, _p: any, _k: any, topic?: string) => {
          if (!alive || topic !== "admission") return;
          try {
            const msg = JSON.parse(new TextDecoder().decode(payload));

            if (msg.type === "JOIN_APPROVED" && msg.payload.userId === currentUser.uid) {
              logAdmissionEvent("GUEST_RECEIVED_APPROVAL", meeting.id, currentUser.uid);
              clearTimeout(timeoutId);
              alive = false;
              restrictedRoom?.disconnect();
              restrictedRoom = null;
              onAdmittedRef.current(msg.payload.token ?? "");
            } else if (msg.type === "JOIN_REJECTED" && msg.payload.userId === currentUser.uid) {
              logAdmissionEvent("GUEST_RECEIVED_REJECTION", meeting.id, currentUser.uid);
              clearTimeout(timeoutId);
              alive = false;
              restrictedRoom?.disconnect();
              restrictedRoom = null;
              setStatus("rejected");
            }
          } catch (e) {
            logError("Failed to parse admission event", { error: e });
          }
        }
      );

      // ── 3. Connect ─────────────────────────────────────────────────────
      try {
        await restrictedRoom.connect(LIVEKIT_URL, waitingToken);
      } catch (err) {
        if (!alive) return;
        setErrorMessage("Failed to connect to waiting room.");
        setStatus("error");
        return;
      }

      if (!alive) {
        restrictedRoom.disconnect();
        return;
      }

      // ── 4. Show waiting UI & set 30s timeout ──────────────────────────
      setStatus("waiting");

      timeoutId = setTimeout(() => {
        if (!alive) return;
        alive = false;
        restrictedRoom?.disconnect();
        restrictedRoom = null;
        setStatus("timeout");
      }, 30000);
    };

    run().catch((err) => {
      if (alive) {
        logError("Unexpected error in admission flow", { error: err });
        setStatus("error");
      }
    });

    return () => {
      alive = false;
      clearTimeout(timeoutId!);
      restrictedRoom?.disconnect();
    };
  }, [meeting.id, currentUser.uid, retryKey]);

  // ── Screens ─────────────────────────────────────────────────────────────

  if (status === "requesting") {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse font-medium">{t("requestingJoin")}</p>
      </div>
    );
  }

  if (status === "waiting") {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center text-center p-8">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 mx-auto" />
        <h2 className="text-2xl font-bold mb-2">{t("waitingApproval")}</h2>
        <p className="text-muted-foreground">{t("waitingApprovalDesc")}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md w-full p-8 border border-border/40 bg-card rounded-2xl shadow-sm">
          <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive flex items-center justify-center rounded-full mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Connection Error</h1>
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
          <button
            onClick={() => { setStatus("requesting"); setErrorMessage(null); setRetryKey((k) => k + 1); }}
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t("requestTimedOut")}</h1>
          <p className="text-muted-foreground">{t("requestTimedOutDesc")}</p>
        </div>
      </div>
    );
  }

  return null;
}
