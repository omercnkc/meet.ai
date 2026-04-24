import { useLocalParticipant, useRoomContext } from "@livekit/components-react"
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff } from "lucide-react"

type Props = {
  onLeave: () => void
}

export function MeetingControls({ onLeave }: Props) {
  const room = useRoomContext()
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant()

  const toggleMic = () => {
    localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
  }

  const toggleCamera = () => {
    localParticipant.setCameraEnabled(!isCameraEnabled)
  }

  const toggleScreenShare = () => {
    localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
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
            : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
            : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
        }`}
        title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isCameraEnabled ? (
          <Video className="w-5 h-5" />
        ) : (
          <VideoOff className="w-5 h-5" />
        )}
      </button>

      <button
        onClick={toggleScreenShare}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm ${
          isScreenShareEnabled
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
        title="Share screen"
      >
        <MonitorUp className="w-5 h-5" />
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
