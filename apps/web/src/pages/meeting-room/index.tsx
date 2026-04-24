import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Header } from "@/features/marketing/components/header"
import { useAuth } from "@/app/providers/auth-provider"
import { subscribeToMeeting, Meeting } from "@/shared/lib/firebase/services/meetings"
import { Video, Share2, AlertCircle } from "lucide-react"
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react"
import { getLiveKitToken, LIVEKIT_URL } from "@/shared/lib/livekit/token-service"
import { TaskPanel } from "./components/task-panel"
import { MediaStage } from "./components/media-stage"
import { MeetingControls } from "./components/meeting-controls"

export default function MeetingRoomPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  // Subscribe to Firestore meeting document
  useEffect(() => {
    if (!meetingId) return
    const unsubscribe = subscribeToMeeting(meetingId, (data) => {
      setMeeting(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [meetingId])

  // Request a LiveKit token via the token service
  useEffect(() => {
    if (!meeting || !currentUser || !meetingId) return

    getLiveKitToken(meetingId, currentUser)
      .then(setToken)
      .catch((err) => setTokenError(err.message))
  }, [meeting, currentUser, meetingId])

  const handleShareInvite = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    alert("Meeting link copied to clipboard!")
  }

  const handleLeave = () => {
    navigate("/dashboard")
  }

  // --- Loading: fetching meeting document ---
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="mt-4 text-muted-foreground animate-pulse font-medium">
          Entering meeting...
        </p>
      </div>
    )
  }

  // --- Meeting not found ---
  if (!meeting) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground pt-16">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md w-full p-8 border border-border/40 bg-card rounded-2xl shadow-sm">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive flex items-center justify-center rounded-full mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Meeting Not Found
            </h1>
            <p className="text-muted-foreground">
              The meeting link is invalid or the meeting has already securely
              concluded.
            </p>
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

  // --- Token error ---
  if (tokenError) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground pt-16">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md w-full p-8 border border-border/40 bg-card rounded-2xl shadow-sm">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive flex items-center justify-center rounded-full mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Connection Error
            </h1>
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

  // --- Waiting for token ---
  if (!token) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="mt-4 text-muted-foreground animate-pulse font-medium">
          Connecting to room...
        </p>
      </div>
    )
  }

  // --- Main meeting room (inside LiveKit context) ---
  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      audio={false}
      video={false}
      className="flex flex-col h-screen bg-background text-foreground overflow-hidden"
    >
      {/* Renders all remote audio tracks automatically */}
      <RoomAudioRenderer />

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

      {/* Main Content: Video + Side Panel */}
      <main className="flex-1 flex overflow-hidden">
        <MediaStage />
        <TaskPanel meetingId={meetingId!} />
      </main>

      {/* Bottom Controls */}
      <MeetingControls onLeave={handleLeave} />
    </LiveKitRoom>
  )
}
