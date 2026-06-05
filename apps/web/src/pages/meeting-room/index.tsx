import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Header } from "@/features/marketing/components/header"
import { useAuth } from "@/app/providers/auth-provider"
import { subscribeToMeeting, Meeting, endMeeting } from "@/shared/lib/firebase/services/meetings"
import { Video, Share2, AlertCircle, Check, Users } from "lucide-react"
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useConnectionState } from "@livekit/components-react"
import { ConnectionState } from "livekit-client"
import { getLiveKitToken, LIVEKIT_URL } from "@/shared/lib/livekit/token-service"
import { TaskPanel } from "./components/task-panel"
import { MediaStage } from "./components/media-stage"
import { MeetingControls } from "./components/meeting-controls"
import { PipContent } from "./components/pip-content"
import { AdmissionControlListener } from "./components/admission-listener"
import { GuestAdmissionFlow } from "./components/guest-admission-flow"
import { HostControlsPanel } from "./components/host-controls-panel"
import { useMeetingRecorder } from "./hooks/useMeetingRecorder"
import { useHostControls } from "./hooks/useHostControls"
import { logInfo, logAdmissionEvent, logError } from "@/shared/lib/logger"

const PIP_SUPPORTED = typeof window !== "undefined" && "documentPictureInPicture" in window

export default function MeetingRoomPage() {
  const { t } = useTranslation("meeting");
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  // Meeting & Token State
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  // PiP & Overlay State
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [pipHint, setPipHint] = useState(false)
  const [isOverlayHidden, setIsOverlayHidden] = useState(false)
  const [isPipHiddenForSession, setIsPipHiddenForSession] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [showHostControls, setShowHostControls] = useState(false)
  const [isForceMutedByHost, setIsForceMutedByHost] = useState(false)

  // ─── Recording ───
  const recorder = useMeetingRecorder(meetingId, currentUser)

  // Refs for tracking across listeners
  const pipPreparedRef = useRef(false)
  const localParticipantRef = useRef<any>(null)

  // ─── Firebase Subscription ───
  useEffect(() => {
    if (!meetingId) return
    const unsubscribe = subscribeToMeeting(meetingId, (data) => {
      setMeeting(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [meetingId])

  // Redirect if ended
  useEffect(() => {
    if (meeting?.status === "ended") {
      navigate(`/meetings/${meetingId}/summary`, { replace: true })
    }
  }, [meeting?.status, meetingId, navigate])

  // ─── LiveKit Token ───
  const isGuest = meeting && currentUser ? (() => {
    // DEVELOPMENT LOG: Check if participantIds exists due to mobile schema sync
    if (import.meta.env.DEV && (meeting as any).participantIds === undefined) {
      console.warn("Meeting.participantIds is undefined. Schema might have been updated to single userId.");
    }

    const hostId = (meeting as any).hostId || meeting.userId;
    const participants = (meeting as any).participantIds || [];

    return currentUser.uid !== hostId && !(Array.isArray(participants) && participants.includes(currentUser.uid));
  })() : false;

  useEffect(() => {
    if (!meeting || !currentUser || !meetingId) return
    if (isGuest) return // Guests get token via admission flow

    getLiveKitToken(meetingId, currentUser)
      .then((tk) => {
        setToken(tk);
        logAdmissionEvent("FULL_TOKEN_GENERATED", meetingId, currentUser.uid, { role: "host_or_participant" });
      })
      .catch((err) => {
        setTokenError(err.message);
        logError("Failed to fetch full token", { error: err.message, meetingId, userId: currentUser.uid });
      })
  }, [meeting, currentUser, meetingId, isGuest])

  // ─── PiP Helpers ───
  const copyStylesToWindow = useCallback((target: Window) => {
    target.document.documentElement.className = document.documentElement.className
      ;[...document.styleSheets].forEach((sheet) => {
        try {
          const cssText = [...sheet.cssRules].map((r) => r.cssText).join("\n")
          const style = target.document.createElement("style")
          style.textContent = cssText
          target.document.head.appendChild(style)
        } catch {
          if (sheet.href) {
            const link = target.document.createElement("link")
            link.rel = "stylesheet"
            link.href = sheet.href
            target.document.head.appendChild(link)
          }
        }
      })
  }, [])

  const openPipWindow = useCallback(async (): Promise<Window | null> => {
    if (!PIP_SUPPORTED) return null
    if (pipWindow && !pipWindow.closed) return pipWindow

    try {
      const pip = await window.documentPictureInPicture!.requestWindow({
        width: 400,
        height: 280,
      })
      pip.document.title = "Meet.ai — Mini Meeting"
      copyStylesToWindow(pip)

      pip.addEventListener("pagehide", () => {
        setPipWindow(null)
      })

      setPipWindow(pip)
      pipPreparedRef.current = true
      setPipHint(false)
      setIsPipHiddenForSession(false)
      return pip
    } catch (err) {
      console.warn("[PiP] Could not open:", err)
      return null
    }
  }, [pipWindow, copyStylesToWindow])

  // ─── Action Handlers ───

  const handleScreenShareToggle = useCallback(async () => {
    const lp = localParticipantRef.current
    if (!lp) return

    const currentlySharing = lp.isScreenShareEnabled

    if (currentlySharing) {
      await lp.setScreenShareEnabled(false)
      setIsScreenSharing(false)
      setIsOverlayHidden(false) // reset overlay state for next time
      setIsPipHiddenForSession(false)
      if (pipWindow && !pipWindow.closed) pipWindow.close()
    } else {
      await lp.setScreenShareEnabled(true)
      setIsScreenSharing(true)
      setIsOverlayHidden(false)
      if (PIP_SUPPORTED) {
        await openPipWindow()
      }
    }
  }, [openPipWindow, pipWindow])

  // Allows stopping screen share from the overlay or native browser button
  const handleStopScreenShare = useCallback(async () => {
    const lp = localParticipantRef.current
    if (lp && lp.isScreenShareEnabled) {
      await lp.setScreenShareEnabled(false)
    }
    setIsScreenSharing(false)
    setIsOverlayHidden(false)
    setIsPipHiddenForSession(false)
    if (pipWindow && !pipWindow.closed) pipWindow.close()
  }, [pipWindow])

  const handleHideOverlay = () => {
    setIsOverlayHidden(true)
  }

  // Hide the PiP window but allow it to reopen on next blur
  const handleHidePip = () => {
    setIsPipHiddenForSession(true)
    if (pipWindow && !pipWindow.closed) pipWindow.close()
  }

  // Return from PiP (keep auto-open active)
  const handleReturnToMeet = () => {
    window.focus()
    // We close the PiP so they don't have overlapping UI, but we don't hide it for the session
    // so it will reopen when they leave again.
    if (pipWindow && !pipWindow.closed) pipWindow.close()
  }

  // ─── Visibility / Blur Tracking ───
  useEffect(() => {
    if (!PIP_SUPPORTED || !token) return

    const handleBlur = () => {
      // User is leaving the Meet.ai window/tab
      const shouldAutoOpen = pipPreparedRef.current && isScreenSharing && !isPipHiddenForSession
      if (shouldAutoOpen && (!pipWindow || pipWindow.closed)) {
        openPipWindow().catch(() => setPipHint(true))
      }
    }

    const handleFocus = () => {
      // User returned to Meet.ai
      // We don't hide the hint if it was already shown, they need to see it to click it.
    }

    window.addEventListener("blur", handleBlur)
    window.addEventListener("focus", handleFocus)

    return () => {
      window.removeEventListener("blur", handleBlur)
      window.removeEventListener("focus", handleFocus)
    }
  }, [pipWindow, token, isScreenSharing, isPipHiddenForSession, openPipWindow])

  // Track native screen share stop (e.g. from Chrome's own bar)
  useEffect(() => {
    const lp = localParticipantRef.current
    if (!lp) return
    const handleTrackUnpublished = (track: any) => {
      if (track.source === "screen_share") {
        handleStopScreenShare()
      }
    }
    lp.on("localTrackUnpublished", handleTrackUnpublished)
    return () => {
      lp.off("localTrackUnpublished", handleTrackUnpublished)
    }
  }, [handleStopScreenShare])


  const handleShareInvite = async () => {
    const text = `Join my meeting on meet.ai!\n\nMeeting ID: ${meetingId}`
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join Meeting", text })
      } catch {
        navigator.clipboard.writeText(text)
      }
    } else {
      navigator.clipboard.writeText(text)
    }
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  const handleLeave = async () => {
    // If recording is active, stop and upload before leaving
    if (recorder.state === "recording") {
      try {
        await recorder.stopRecording()
      } catch {
        // Best-effort: don't block leaving if upload fails
      }
    }
    if (pipWindow && !pipWindow.closed) pipWindow.close()
    navigate("/dashboard")
  }

  const handleEndMeeting = async () => {
    // If recording is active, stop and upload before ending
    if (recorder.state === "recording") {
      try {
        await recorder.stopRecording()
      } catch {
        // Best-effort: don't block ending if upload fails
      }
    }
    if (pipWindow && !pipWindow.closed) pipWindow.close()

    try {
      await endMeeting(meetingId!)
    } catch (err) {
      console.error("Failed to end meeting:", err)
    }
    // navigation will happen automatically via the useEffect on meeting.status,
    // but we can also eagerly navigate:
    navigate(`/meetings/${meetingId}/summary`, { replace: true })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pipWindow?.close()
    }
  }, [pipWindow])

  // ─── Render: loading / error ───

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="mt-4 text-muted-foreground animate-pulse font-medium">{t("enteringMeeting")}</p>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground pt-16">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md w-full p-8 border border-border/40 bg-card rounded-2xl shadow-sm">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive flex items-center justify-center rounded-full mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t("meetingNotFound")}</h1>
            <p className="text-muted-foreground">{t("meetingNotFoundDesc")}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-4 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors w-full"
            >
              {t("returnToDashboard")}
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground pt-16">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md w-full p-8 border border-border/40 bg-card rounded-2xl shadow-sm">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive flex items-center justify-center rounded-full mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t("connectionError")}</h1>
            <p className="text-muted-foreground text-sm">{tokenError}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-4 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors w-full"
            >
              {t("returnToDashboard")}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ─── Guest Flow ───
  if (isGuest && !token) {
    return (
      <GuestAdmissionFlow
        meeting={meeting}
        currentUser={currentUser!}
        onAdmitted={(approvedToken) => {
          logAdmissionEvent("GUEST_UPGRADED_TO_FULL_TOKEN", meeting.id, currentUser!.uid);
          // Assuming we need to get the real token via getLiveKitToken or use the one from payload. 
          // If the architecture fetches it, fetch it here. We established they use token-service.
          getLiveKitToken(meeting.id, currentUser!)
            .then(tk => {
              setToken(tk);
              logAdmissionEvent("FULL_TOKEN_GENERATED", meeting.id, currentUser!.uid, { role: "guest" });
            })
            .catch(err => logError("Failed to fetch full token for guest", { error: err }));
        }}
      />
    )
  }

  if (!token) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="mt-4 text-muted-foreground animate-pulse font-medium">{t("connectingToRoom")}</p>
      </div>
    )
  }

  const isOverlayVisible = isScreenSharing && !isOverlayHidden

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      audio={false}
      video={false}
      className="flex flex-col h-screen bg-background text-foreground overflow-hidden relative"
    >
      <ConnectionStatusOverlay />
      <RoomAudioRenderer />

      {/* Capture localParticipant ref via a child component */}
      <LocalParticipantCapture
        participantRef={localParticipantRef}
        onScreenShareStateChange={setIsScreenSharing}
      />

      {meeting && (
        <AdmissionControlListener
          meetingId={meetingId!}
          hostId={(meeting as any).hostId || meeting.userId}
          currentUserId={currentUser?.uid}
          onPendingChange={setPendingCount}
        />
      )}

      {meeting && (
        <HostControlsManager
          meetingId={meetingId!}
          hostId={(meeting as any).hostId || meeting.userId}
          currentUserId={currentUser?.uid}
          isOpen={showHostControls}
          onClose={() => setShowHostControls(false)}
          onScreenShareStop={handleStopScreenShare}
          onForceMuteChange={setIsForceMutedByHost}
        />
      )}

      {/* Meeting Header */}
      <header className="h-16 border-b border-border/40 bg-card/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Video className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="font-semibold text-lg">{meeting.title}</h1>
          </div>
          <div className="h-4 w-px bg-border/60 hidden md:block" />
          <span className="hidden md:inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
            {meeting.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Pending join requests badge — only for host */}
          {((meeting as any).hostId || meeting.userId) === currentUser?.uid && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pendingCount > 0
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 animate-pulse"
                : "bg-muted text-muted-foreground border border-transparent"
            }`}>
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">
                {pendingCount > 0 ? `${pendingCount} waiting` : "No requests"}
              </span>
              {pendingCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none">
                  {pendingCount}
                </span>
              )}
            </div>
          )}

          {/* Participants panel toggle — host only */}
          {((meeting as any).hostId || meeting.userId) === currentUser?.uid && (
            <button
              onClick={() => setShowHostControls((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border font-medium transition-colors text-sm ${
                showHostControls
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Participants</span>
            </button>
          )}

          <button
            onClick={handleShareInvite}
            className="flex items-center gap-2 px-4 py-1.5 rounded-md border border-input bg-background font-medium hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            {inviteCopied
              ? <><Check className="w-4 h-4 text-green-500" /><span className="hidden sm:inline text-green-500">Copied!</span></>
              : <><Share2 className="w-4 h-4" /><span className="hidden sm:inline">{t("shareInvite")}</span></>
            }
          </button>
        </div>
      </header>

      {/* PiP Hint Banner */}
      {pipHint && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between shrink-0 z-10">
          <span className="text-xs text-primary font-medium">
            {t("pipHint")}
          </span>
          <button
            onClick={async () => {
              await openPipWindow()
              setPipHint(false)
            }}
            className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Enable Mini Window
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <MediaStage />
        <TaskPanel meetingId={meetingId!} />
      </main>

      {/* Bottom Controls */}
      <MeetingControls
        onLeave={handleLeave}
        onEndMeeting={((meeting as any).hostId || meeting.userId) === currentUser?.uid ? handleEndMeeting : undefined}
        onScreenShareWithPip={handleScreenShareToggle}
        recordingState={recorder.state}
        recordingElapsed={recorder.elapsed}
        recordingSupported={recorder.isSupported}
        recordingError={recorder.errorMessage}
        onStartRecording={recorder.startRecording}
        onStopRecording={recorder.stopRecording}
        isForceMutedByHost={isForceMutedByHost}
      />

      {/* Document PiP Portal (External window overlay) */}
      {pipWindow && !pipWindow.closed && createPortal(
        <>
          <PipContent
            onReturn={handleReturnToMeet}
            onHide={handleHidePip}
          />

          {/* Custom Bottom Sharing Overlay (Rendered inside the PiP window) */}
          {isOverlayVisible && (
            <div
              className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[100] flex flex-wrap items-center justify-center gap-2 px-3 py-1.5 bg-background/70 backdrop-blur-md border border-white/10 rounded-xl shadow-lg w-auto max-w-[90%]"
            >
              <span className="text-[10px] font-medium text-foreground/90 whitespace-nowrap overflow-hidden text-ellipsis">
                {t("tabShared")}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleHideOverlay}
                  className="h-6 px-2.5 rounded-md text-[10px] font-medium bg-secondary/80 text-secondary-foreground hover:bg-secondary transition-colors"
                >
                  Hide
                </button>
                <button
                  onClick={handleStopScreenShare}
                  className="h-6 px-2.5 rounded-md text-[10px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
                >
                  Stop sharing
                </button>
              </div>
            </div>
          )}
        </>,
        pipWindow.document.body
      )}
    </LiveKitRoom>
  )
}

/**
 * Always-mounted component that activates the host-control DataChannel listener
 * and conditionally renders the HostControlsPanel when isOpen.
 * Must live inside <LiveKitRoom> to use useRoomContext.
 */
function HostControlsManager({
  meetingId,
  hostId,
  currentUserId,
  isOpen,
  onClose,
  onScreenShareStop,
  onForceMuteChange,
}: {
  meetingId: string;
  hostId: string;
  currentUserId?: string;
  isOpen: boolean;
  onClose: () => void;
  onScreenShareStop: () => void;
  onForceMuteChange: (v: boolean) => void;
}) {
  const { kick, mute, requestUnmute, stopScreenShare, muteAll, isForceMutedByHost } = useHostControls({
    meetingId,
    hostId,
    currentUserId,
    onScreenShareStop,
  });

  // Propagate force-mute state up to MeetingRoomPage so MeetingControls can read it
  useEffect(() => {
    onForceMuteChange(isForceMutedByHost);
  }, [isForceMutedByHost, onForceMuteChange]);

  return (
    <HostControlsPanel
      isOpen={isOpen}
      onClose={onClose}
      currentUserId={currentUserId}
      kick={kick}
      mute={mute}
      requestUnmute={requestUnmute}
      stopScreenShare={stopScreenShare}
      muteAll={muteAll}
    />
  );
}

/**
 * Invisible helper that captures the LiveKit localParticipant into a ref
 */
function LocalParticipantCapture({
  participantRef,
  onScreenShareStateChange,
}: {
  participantRef: React.MutableRefObject<any>
  onScreenShareStateChange: (isSharing: boolean) => void
}) {
  const { localParticipant } = useLocalParticipant()

  useEffect(() => {
    participantRef.current = localParticipant
  }, [localParticipant, participantRef])

  useEffect(() => {
    if (localParticipant) {
      onScreenShareStateChange(localParticipant.isScreenShareEnabled)
    }
  }, [localParticipant, localParticipant?.isScreenShareEnabled, onScreenShareStateChange])

  return null
}

/**
 * Overlay for LiveKit connection states
 */
function ConnectionStatusOverlay() {
  const { t } = useTranslation("meeting");
  const state = useConnectionState()

  if (state === ConnectionState.Connected) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-2xl shadow-xl border border-border/50 text-center max-w-sm mx-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-lg font-medium text-foreground">
          {state === ConnectionState.Connecting ? t("connectingMeeting") :
            state === ConnectionState.Reconnecting ? t("reconnecting") :
              state === ConnectionState.Disconnected ? t("disconnected") : t("connecting")}
        </p>
      </div>
    </div>
  )
}
