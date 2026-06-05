import { useRef, useEffect, useState } from "react"
import { Track, Participant, LocalParticipant } from "livekit-client"
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react"
import { MicOff, Mic } from "lucide-react"

type Props = {
  trackRef: TrackReferenceOrPlaceholder
  /** When true, this tile is rendering a screen share track */
  isScreenShare?: boolean
}

export function ParticipantTile({ trackRef, isScreenShare = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const participant = trackRef.participant
  const publication = "publication" in trackRef ? trackRef.publication : undefined
  const initialTrack = publication?.track
  const isLocal = participant instanceof LocalParticipant
  
  const [activeTrack, setActiveTrack] = useState(initialTrack)
  const [hasVideo, setHasVideo] = useState(!!initialTrack && !publication?.isMuted)
  const [isMicMuted, setIsMicMuted] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(participant.isSpeaking)

  // Sync activeTrack + hasVideo whenever the publication's track object changes.
  // This is the primary fix: useState(initialTrack) only runs on the first render,
  // so when useTracks provides a new trackRef after subscription, state wouldn't
  // update otherwise. The track object itself is a stable reference while subscribed.
  const liveTrack = publication?.track
  useEffect(() => {
    setActiveTrack(liveTrack)
    setHasVideo(!!liveTrack && !(publication?.isMuted ?? false))
  }, [liveTrack]) // eslint-disable-line react-hooks/exhaustive-deps

  // Attach / detach video track whenever activeTrack or hasVideo changes.
  // hasVideo gates whether the <video> element exists in the DOM.
  useEffect(() => {
    const el = videoRef.current
    if (el && activeTrack) {
      activeTrack.attach(el)
      return () => {
        activeTrack.detach(el)
      }
    }
  }, [activeTrack, hasVideo])

  // Track mic status and speaking state reactively via participant events.
  // (activeTrack / hasVideo are handled by the trackRef sync effect above.)
  useEffect(() => {
    const updateStatus = () => {
      const micPub = participant.getTrackPublication(Track.Source.Microphone)
      setIsMicMuted(!micPub?.track || micPub.isMuted)

      const camPub = isScreenShare
        ? participant.getTrackPublication(Track.Source.ScreenShare)
        : participant.getTrackPublication(Track.Source.Camera)

      const currentTrack = camPub?.track
      setActiveTrack(currentTrack)
      setHasVideo(!!currentTrack && !(camPub?.isMuted ?? false))
    }

    const updateSpeaking = (speaking: boolean) => setIsSpeaking(speaking)

    updateStatus()

    participant.on("trackMuted", updateStatus)
    participant.on("trackUnmuted", updateStatus)
    participant.on("trackPublished", updateStatus)
    participant.on("trackUnpublished", updateStatus)
    participant.on("trackSubscribed", updateStatus)
    participant.on("trackUnsubscribed", updateStatus)
    participant.on("localTrackPublished", updateStatus)
    participant.on("localTrackUnpublished", updateStatus)
    participant.on("isSpeakingChanged", updateSpeaking)

    return () => {
      participant.off("trackMuted", updateStatus)
      participant.off("trackUnmuted", updateStatus)
      participant.off("trackPublished", updateStatus)
      participant.off("trackUnpublished", updateStatus)
      participant.off("trackSubscribed", updateStatus)
      participant.off("trackUnsubscribed", updateStatus)
      participant.off("localTrackPublished", updateStatus)
      participant.off("localTrackUnpublished", updateStatus)
      participant.off("isSpeakingChanged", updateSpeaking)
    }
  }, [participant, isScreenShare])

  const displayName = participant.name || participant.identity
  const initial = displayName?.[0]?.toUpperCase() || "?"

  return (
    <div className={`relative bg-card border rounded-2xl overflow-hidden flex items-center justify-center shadow-sm h-full transition-all duration-300 ${
      isSpeaking && !isScreenShare ? "ring-4 ring-primary border-transparent" : "border-border/40"
    }`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          className={`w-full h-full ${
            isScreenShare ? "object-contain bg-black" : "object-cover"
          } transition-opacity duration-300 ${isLocal && !isScreenShare ? "scale-x-[-1]" : ""}`}
          autoPlay
          playsInline
          muted={isLocal || isScreenShare}
        />
      ) : (
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center shadow-inner border border-primary/10">
          <span className="text-3xl sm:text-5xl font-semibold text-primary/80">
            {initial}
          </span>
        </div>
      )}

      {/* Mic muted indicator — only on camera tiles */}
      {!isScreenShare && (
        <div className={`absolute top-3 right-3 p-1.5 rounded-full shadow-lg backdrop-blur-md transition-colors ${
          isMicMuted ? "bg-red-500/90 text-white" : "bg-secondary/80 text-secondary-foreground"
        }`}>
          {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </div>
      )}

      {/* Name badge */}
      <div className="absolute bottom-3 left-3 bg-background/85 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium border border-border/50 shadow-sm">
        {displayName} {isLocal && "(You)"} {isScreenShare && "— Screen"}
      </div>
    </div>
  )
}
