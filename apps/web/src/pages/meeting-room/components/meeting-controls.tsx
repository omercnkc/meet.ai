import { useEffect, useState } from "react"
import { useRoomContext } from "@livekit/components-react"
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff } from "lucide-react"

import { CircleDot } from "lucide-react"

type Props = {
  onLeave: () => void
  onScreenShareWithPip: () => void
}

export function MeetingControls({ onLeave, onScreenShareWithPip }: Props) {
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

  return (
    <footer className="h-20 border-t border-border/40 bg-card/80 backdrop-blur-md flex items-center justify-center gap-3 px-4 shrink-0 z-10">
      <button
        onClick={toggleMic}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm ${
          isMicrophoneEnabled
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            : "bg-red-500 text-white hover:bg-red-600"
        }`}
        title={isMicrophoneEnabled ? "Mute" : "Unmute"}
      >
        {isMicrophoneEnabled ? (
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

      <button
        disabled
        className="px-4 h-12 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm bg-secondary text-secondary-foreground opacity-50 cursor-not-allowed shrink-0"
        title="Recording (Coming Soon)"
      >
        <CircleDot className="w-5 h-5 text-red-400/70" />
        <span className="hidden sm:inline text-xs font-medium uppercase tracking-wider text-muted-foreground">Coming Soon</span>
      </button>

      <div className="w-px h-8 bg-border/60 mx-1" />

      <button
        onClick={handleLeave}
        className="px-6 h-12 rounded-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-sm"
        title="Leave meeting"
      >
        <PhoneOff className="w-5 h-5" />
        <span className="hidden sm:inline">Leave</span>
      </button>
    </footer>
  )
}
