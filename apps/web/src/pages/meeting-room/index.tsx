import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { useParams, useNavigate } from "react-router-dom"
import { Header } from "@/features/marketing/components/header"
import { useAuth } from "@/app/providers/auth-provider"
import { subscribeToMeeting, Meeting } from "@/shared/lib/firebase/services/meetings"
import { Video, Share2, AlertCircle } from "lucide-react"
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useConnectionState } from "@livekit/components-react"
import { ConnectionState } from "livekit-client"
import { getLiveKitToken, LIVEKIT_URL } from "@/shared/lib/livekit/token-service"
import { TaskPanel } from "./components/task-panel"
import { MediaStage } from "./components/media-stage"
import { MeetingControls } from "./components/meeting-controls"
import { PipContent } from "./components/pip-content"

const PIP_SUPPORTED = typeof window !== "undefined" && "documentPictureInPicture" in window

export default function MeetingRoomPage() {
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
  const [pipHint, setPipHint] = useState(false)
  const [isOverlayHidden, setIsOverlayHidden] = useState(false)
  const [isPipHiddenForSession, setIsPipHiddenForSession] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

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

  // ─── LiveKit Token ───
  useEffect(() => {
    if (!meeting || !currentUser || !meetingId) return
    getLiveKitToken(meetingId, currentUser)
      .then(setToken)
      .catch((err) => setTokenError(err.message))
  }, [meeting, currentUser, meetingId])

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


  const handleShareInvite = () => {
    navigator.clipboard.writeText(window.location.href)
    alert("Meeting link copied to clipboard!")
  }

  const handleLeave = () => {
    if (pipWindow && !pipWindow.closed) pipWindow.close()
    navigate("/dashboard")
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
        <p className="mt-4 text-muted-foreground animate-pulse font-medium">Entering meeting...</p>
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
            <h1 className="text-2xl font-bold tracking-tight">Meeting Not Found</h1>
            <p className="text-muted-foreground">The meeting link is invalid or the meeting has already securely concluded.</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-4 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors w-full"
            >
              Return to Dashboard
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
            <h1 className="text-2xl font-bold tracking-tight">Connection Error</h1>
            <p className="text-muted-foreground text-sm">{tokenError}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-4 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors w-full"
            >
              Return to Dashboard
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="mt-4 text-muted-foreground animate-pulse font-medium">Connecting to room...</p>
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
          <span className="text-sm font-medium hidden sm:block bg-muted px-3 py-1.5 rounded-md text-muted-foreground">
            {meeting.participantIds.length} participant(s)
          </span>
          <button
            onClick={handleShareInvite}
            className="flex items-center gap-2 px-4 py-1.5 rounded-md border border-input bg-background font-medium hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share Invite</span>
          </button>
        </div>
      </header>

      {/* PiP Hint Banner */}
      {pipHint && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between shrink-0 z-10">
          <span className="text-xs text-primary font-medium">
            Click to enable the floating meeting window while browsing other tabs.
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
        onScreenShareWithPip={handleScreenShareToggle}
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
                This tab is being shared with Meet.ai
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
  const state = useConnectionState()
  
  if (state === ConnectionState.Connected) return null
  
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-2xl shadow-xl border border-border/50 text-center max-w-sm mx-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-lg font-medium text-foreground">
          {state === ConnectionState.Connecting ? "Connecting to meeting..." : 
           state === ConnectionState.Reconnecting ? "Connection lost. Reconnecting..." : 
           state === ConnectionState.Disconnected ? "Disconnected." : "Connecting..."}
        </p>
      </div>
    </div>
  )
}
