import { useTracks, useLocalParticipant } from "@livekit/components-react"
import { Track, LocalParticipant } from "livekit-client"
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react"
import { useRef, useEffect } from "react"
import { Video, ArrowLeft, Mic, MicOff, VideoOff, X } from "lucide-react"

/* ── Compact video tile for PiP ── */
function PipVideoTile({
  trackRef,
  isScreenShare,
  className = "",
}: {
  trackRef: TrackReferenceOrPlaceholder
  isScreenShare?: boolean
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const participant = trackRef.participant
  const publication = "publication" in trackRef ? trackRef.publication : undefined
  const track = publication?.track
  const isLocal = participant instanceof LocalParticipant
  const hasVideo = !!track && !publication?.isMuted

  useEffect(() => {
    const el = videoRef.current
    if (el && track) {
      track.attach(el)
      return () => { track.detach(el) }
    }
  }, [track])

  const displayName = participant.name || participant.identity
  const initial = displayName?.[0]?.toUpperCase() || "?"

  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${className}`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: isScreenShare ? "contain" : "cover",
          }}
          autoPlay
          playsInline
          muted={isLocal}
        />
      ) : (
        <div className="flex items-center justify-center" style={{ width: "100%", height: "100%" }}>
          <div
            className="rounded-full bg-secondary flex items-center justify-center"
            style={{ width: "clamp(2rem, 8vw, 3.5rem)", height: "clamp(2rem, 8vw, 3.5rem)" }}
          >
            <span style={{ fontSize: "clamp(0.75rem, 3vw, 1.25rem)" }} className="font-medium text-muted-foreground">
              {initial}
            </span>
          </div>
        </div>
      )}
      {/* Name label — hidden at very small sizes */}
      <div
        className="absolute bottom-1 left-1 bg-background/70 backdrop-blur-sm rounded"
        style={{ padding: "1px 5px", fontSize: "clamp(8px, 2.5vw, 11px)" }}
      >
        <span className="font-medium text-foreground/90">
          {displayName}{isLocal && " (You)"}
        </span>
      </div>
    </div>
  )
}

/* ── Main PiP content ── */
export function PipContent({ onReturn, onHide }: { onReturn: () => void; onHide: () => void }) {
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  )

  const screenShareTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  )

  const { isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant()

  const hasScreenShare = screenShareTracks.length > 0
  const primaryTrack = hasScreenShare ? screenShareTracks[0] : cameraTracks[0]
  const showCameraOverlay = hasScreenShare && cameraTracks.length > 0

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
      className="bg-background text-foreground"
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between shrink-0 bg-card/80 backdrop-blur-sm border-b border-border/30"
        style={{ padding: "clamp(3px, 1.5vw, 8px) clamp(6px, 2vw, 12px)" }}
      >
        <div className="flex items-center" style={{ gap: "clamp(3px, 1vw, 6px)" }}>
          <div
            className="bg-primary rounded flex items-center justify-center"
            style={{ width: "clamp(16px, 5vw, 22px)", height: "clamp(16px, 5vw, 22px)" }}
          >
            <Video style={{ width: "clamp(8px, 2.5vw, 12px)", height: "clamp(8px, 2.5vw, 12px)" }} className="text-primary-foreground" />
          </div>
          <span style={{ fontSize: "clamp(9px, 2.8vw, 13px)" }} className="font-semibold hidden sm:inline-block">
            Meet.ai
          </span>
        </div>

        <div className="flex items-center" style={{ gap: "clamp(3px, 1vw, 6px)" }}>
          {/* Status indicators */}
          <div className="flex items-center" style={{ gap: "2px" }}>
            <div className={`rounded-full flex items-center justify-center ${isMicrophoneEnabled ? "text-green-500" : "text-destructive"}`}
              style={{ width: "clamp(16px, 4vw, 22px)", height: "clamp(16px, 4vw, 22px)" }}
            >
              {isMicrophoneEnabled
                ? <Mic style={{ width: "clamp(8px, 2.5vw, 12px)", height: "clamp(8px, 2.5vw, 12px)" }} />
                : <MicOff style={{ width: "clamp(8px, 2.5vw, 12px)", height: "clamp(8px, 2.5vw, 12px)" }} />
              }
            </div>
            <div className={`rounded-full flex items-center justify-center ${isCameraEnabled ? "text-green-500" : "text-destructive"}`}
              style={{ width: "clamp(16px, 4vw, 22px)", height: "clamp(16px, 4vw, 22px)" }}
            >
              {isCameraEnabled
                ? <Video style={{ width: "clamp(8px, 2.5vw, 12px)", height: "clamp(8px, 2.5vw, 12px)" }} />
                : <VideoOff style={{ width: "clamp(8px, 2.5vw, 12px)", height: "clamp(8px, 2.5vw, 12px)" }} />
              }
            </div>
          </div>

          <div className="w-px h-3 bg-border/50 mx-0.5" />

          {/* Hide button */}
          <button
            onClick={onHide}
            className="flex items-center bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-medium rounded"
            style={{ padding: "clamp(2px, 0.8vw, 5px) clamp(4px, 1.5vw, 10px)", fontSize: "clamp(8px, 2.5vw, 11px)" }}
          >
            <span>Hide</span>
          </button>

          {/* Return button */}
          <button
            onClick={onReturn}
            className="flex items-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium rounded"
            style={{ gap: "2px", padding: "clamp(2px, 0.8vw, 5px) clamp(4px, 1.5vw, 10px)", fontSize: "clamp(8px, 2.5vw, 11px)" }}
          >
            <ArrowLeft style={{ width: "clamp(8px, 2.5vw, 12px)", height: "clamp(8px, 2.5vw, 12px)" }} />
            <span className="hidden sm:inline">Return</span>
          </button>

          {/* Close button */}
          <button
            onClick={() => { window.close() }}
            className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded"
            style={{ width: "clamp(16px, 4vw, 22px)", height: "clamp(16px, 4vw, 22px)" }}
          >
            <X style={{ width: "clamp(8px, 2.5vw, 12px)", height: "clamp(8px, 2.5vw, 12px)" }} />
          </button>
        </div>
      </div>

      {/* ── Main media area ── */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#000" }}>
        {primaryTrack ? (
          <PipVideoTile
            trackRef={primaryTrack}
            isScreenShare={hasScreenShare}
            className="h-full w-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <span style={{ fontSize: "clamp(10px, 3vw, 14px)" }} className="text-muted-foreground">
              No video
            </span>
          </div>
        )}

        {/* Camera overlay (bottom-right corner) when screen share is active */}
        {showCameraOverlay && (
          <div
            style={{
              position: "absolute",
              bottom: "clamp(4px, 1.5vw, 8px)",
              right: "clamp(4px, 1.5vw, 8px)",
              width: "clamp(60px, 28%, 160px)",
              aspectRatio: "16/9",
              borderRadius: "clamp(4px, 1vw, 8px)",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <PipVideoTile trackRef={cameraTracks[0]} className="h-full w-full" />
          </div>
        )}
      </div>

      {/* ── Footer / participant count ── */}
      <div
        className="flex items-center justify-center shrink-0 bg-card/80 border-t border-border/30"
        style={{ padding: "clamp(2px, 0.8vw, 4px)" }}
      >
        <span style={{ fontSize: "clamp(8px, 2vw, 10px)" }} className="text-muted-foreground">
          {cameraTracks.length} participant(s) · Live
        </span>
      </div>
    </div>
  )
}
