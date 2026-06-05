import { useEffect, useState } from "react"
import { useRoomContext } from "@livekit/components-react"
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"

import { CircleDot, Square, CheckCircle2, AlertCircle } from "lucide-react"
import type { RecordingState } from "../hooks/useMeetingRecorder"

type Props = {
  onLeave: () => void
  onEndMeeting?: () => void
  onScreenShareWithPip: () => void
  /** Recording state from useMeetingRecorder */
  recordingState: RecordingState
  /** Elapsed seconds while recording */
  recordingElapsed: number
  /** Whether MediaRecorder is supported */
  recordingSupported: boolean
  /** Error message from recorder, if any */
  recordingError: string | null
  /** Start recording callback */
  onStartRecording: () => void
  /** Stop recording callback */
  onStopRecording: () => void
  /** Mic is locked by host — participant cannot unmute themselves */
  isForceMutedByHost?: boolean
}

/** Format seconds as mm:ss */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function MeetingControls({
  onLeave,
  onEndMeeting,
  onScreenShareWithPip,
  recordingState,
  recordingElapsed,
  recordingSupported,
  recordingError,
  onStartRecording,
  onStopRecording,
  isForceMutedByHost = false,
}: Props) {
  const room = useRoomContext()
  const localParticipant = room.localParticipant
  
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(localParticipant?.isMicrophoneEnabled ?? false)
  const [isCameraEnabled, setIsCameraEnabled] = useState(localParticipant?.isCameraEnabled ?? false)
  const [isScreenShareEnabled, setIsScreenShareEnabled] = useState(localParticipant?.isScreenShareEnabled ?? false)

  useEffect(() => {
    if (!localParticipant) return

    const updateState = () => {
      setIsMicrophoneEnabled(localParticipant.isMicrophoneEnabled)
      setIsCameraEnabled(localParticipant.isCameraEnabled)
      setIsScreenShareEnabled(localParticipant.isScreenShareEnabled)
    }

    updateState()

    localParticipant.on("trackMuted", updateState)
    localParticipant.on("trackUnmuted", updateState)
    localParticipant.on("localTrackPublished", updateState)
    localParticipant.on("localTrackUnpublished", updateState)

    return () => {
      localParticipant.off("trackMuted", updateState)
      localParticipant.off("trackUnmuted", updateState)
      localParticipant.off("localTrackPublished", updateState)
      localParticipant.off("localTrackUnpublished", updateState)
    }
  }, [localParticipant])

  const toggleMic = () => {
    if (isForceMutedByHost) {
      toast.warning("Your microphone is muted by the host. Wait for them to send an unmute request.");
      return;
    }
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
    }
  }

  const toggleCamera = () => {
    if (localParticipant) {
      localParticipant.setCameraEnabled(!isCameraEnabled)
    }
  }

  const handleLeave = () => {
    room.disconnect()
    onLeave()
  }

  const handleEnd = () => {
    room.disconnect()
    if (onEndMeeting) onEndMeeting()
  }

  // ── Recording button rendering ──

  const renderRecordingButton = () => {
    // Browser doesn't support MediaRecorder
    if (!recordingSupported) {
      return (
        <button
          disabled
          className="px-4 h-12 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm bg-secondary text-secondary-foreground opacity-50 cursor-not-allowed shrink-0"
          title="Recording is not supported in this browser"
        >
          <CircleDot className="w-5 h-5 text-muted-foreground" />
          <span className="hidden sm:inline text-xs font-medium text-muted-foreground">Not Supported</span>
        </button>
      )
    }

    switch (recordingState) {
      case "idle":
        return (
          <button
            onClick={onStartRecording}
            className="px-4 h-12 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 shrink-0"
            title="Start recording"
          >
            <CircleDot className="w-5 h-5 text-red-500" />
            <span className="hidden sm:inline text-xs font-medium">Record</span>
          </button>
        )

      case "recording":
        return (
          <button
            onClick={onStopRecording}
            className="px-4 h-12 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 shrink-0 group"
            title="Stop recording"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <Square className="w-4 h-4 hidden group-hover:block" />
            <span className="text-xs font-semibold tabular-nums">{formatElapsed(recordingElapsed)}</span>
          </button>
        )

      case "stopping":
        return (
          <button
            disabled
            className="px-4 h-12 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm bg-secondary text-secondary-foreground opacity-70 cursor-wait shrink-0"
            title="Stopping..."
          >
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="hidden sm:inline text-xs font-medium text-muted-foreground">Stopping...</span>
          </button>
        )

      case "uploading":
        return (
          <button
            disabled
            className="px-4 h-12 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm bg-primary/10 border border-primary/30 text-primary cursor-wait shrink-0"
            title="Uploading recording..."
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="hidden sm:inline text-xs font-medium">Uploading...</span>
          </button>
        )

      case "uploaded":
        return (
          <button
            onClick={onStartRecording}
            className="px-4 h-12 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-secondary hover:text-secondary-foreground hover:border-transparent shrink-0"
            title="Recording uploaded! Click to record again"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-medium">Uploaded</span>
          </button>
        )

      case "error":
        return (
          <button
            onClick={onStartRecording}
            className="px-4 h-12 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-secondary hover:text-secondary-foreground hover:border-transparent shrink-0"
            title={recordingError || "Recording failed. Click to retry."}
          >
            <AlertCircle className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-medium">Retry</span>
          </button>
        )

      default:
        return null
    }
  }

  return (
    <footer className="h-20 border-t border-border/40 bg-card/80 backdrop-blur-md flex items-center justify-center gap-3 px-4 shrink-0 z-10">
      <button
        onClick={toggleMic}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm ${
          isForceMutedByHost
            ? "bg-red-900 text-white cursor-not-allowed"
            : isMicrophoneEnabled
              ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              : "bg-red-500 text-white hover:bg-red-600"
        }`}
        title={isForceMutedByHost ? "Muted by host — waiting for unmute permission" : (isMicrophoneEnabled ? "Mute" : "Unmute")}
      >
        {isForceMutedByHost ? (
          <Lock className="w-4 h-4" />
        ) : isMicrophoneEnabled ? (
          <Mic className="w-5 h-5" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </button>

      <button
        onClick={toggleCamera}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm ${
          isCameraEnabled
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            : "bg-red-500 text-white hover:bg-red-600"
        }`}
        title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isCameraEnabled ? (
          <Video className="w-5 h-5" />
        ) : (
          <VideoOff className="w-5 h-5" />
        )}
      </button>

      {/* Screen share button — also opens PiP when starting share */}
      <button
        onClick={onScreenShareWithPip}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm ${
          isScreenShareEnabled
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
        title={isScreenShareEnabled ? "Stop sharing" : "Share screen"}
      >
        <MonitorUp className="w-5 h-5" />
      </button>

      {/* Recording button */}
      {renderRecordingButton()}

      <div className="w-px h-8 bg-border/60 mx-1" />

      <div className="flex items-center gap-2">
        <button
          onClick={handleLeave}
          className="px-6 h-12 rounded-full flex items-center justify-center gap-2 bg-secondary/80 hover:bg-secondary text-secondary-foreground font-medium transition-colors shadow-sm"
          title="Leave meeting"
        >
          <span className="hidden sm:inline">Leave</span>
        </button>

        {onEndMeeting && (
          <button
            onClick={handleEnd}
            className="px-6 h-12 rounded-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-sm"
            title="End meeting for everyone"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">End Meeting</span>
          </button>
        )}
      </div>
    </footer>
  )
}
