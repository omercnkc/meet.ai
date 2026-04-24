import { useRef, useEffect, useState } from "react"
import { Track, Participant, LocalParticipant } from "livekit-client"
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react"
import { MicOff } from "lucide-react"

type Props = {
  trackRef: TrackReferenceOrPlaceholder
}

export function ParticipantTile({ trackRef }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const participant = trackRef.participant
  const publication = "publication" in trackRef ? trackRef.publication : undefined
  const track = publication?.track
  const isLocal = participant instanceof LocalParticipant
  const hasVideo = !!track && !publication?.isMuted

  const [isMicMuted, setIsMicMuted] = useState(true)

  // Attach / detach video track
  useEffect(() => {
    const el = videoRef.current
    if (el && track) {
      track.attach(el)
      return () => {
        track.detach(el)
      }
    }
  }, [track])

  // Track mic status reactively via participant events
  useEffect(() => {
    const updateMicStatus = () => {
      const micPub = participant.getTrackPublication(Track.Source.Microphone)
      setIsMicMuted(!micPub?.track || micPub.isMuted)
    }

    updateMicStatus()

    participant.on("trackMuted", updateMicStatus)
    participant.on("trackUnmuted", updateMicStatus)
    participant.on("trackPublished", updateMicStatus)
    participant.on("trackUnpublished", updateMicStatus)

    return () => {
      participant.off("trackMuted", updateMicStatus)
      participant.off("trackUnmuted", updateMicStatus)
      participant.off("trackPublished", updateMicStatus)
      participant.off("trackUnpublished", updateMicStatus)
    }
  }, [participant])

  const displayName = participant.name || participant.identity
  const initial = displayName?.[0]?.toUpperCase() || "?"

  return (
    <div className="relative bg-card border border-border/40 rounded-2xl overflow-hidden flex items-center justify-center shadow-sm h-full">
      {hasVideo ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted={isLocal}
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center shadow-inner">
          <span className="text-2xl font-medium text-muted-foreground">
            {initial}
          </span>
        </div>
      )}

      {isMicMuted && (
        <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground p-1.5 rounded-full shadow-lg">
          <MicOff className="w-3.5 h-3.5" />
        </div>
      )}

      <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-medium border border-border/50">
        {displayName} {isLocal && "(You)"}
      </div>
    </div>
  )
}
