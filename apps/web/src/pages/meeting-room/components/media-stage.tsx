import { useTracks } from "@livekit/components-react"
import { Track } from "livekit-client"
import { ParticipantTile } from "./participant-tile"
import { MonitorUp } from "lucide-react"

function isWaitingParticipant(participant: any): boolean {
  try {
    return JSON.parse(participant?.metadata || "{}").waiting === true
  } catch {
    return false
  }
}

export function MediaStage() {
  const allCameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  )
  const cameraTracks = allCameraTracks.filter(
    (ref) => !isWaitingParticipant(ref.participant)
  )

  const allScreenShareTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  )
  const screenShareTracks = allScreenShareTracks.filter(
    (ref) => !isWaitingParticipant(ref.participant)
  )

  const hasScreenShare = screenShareTracks.length > 0

  // When a screen share is active, show it as the main/focused view
  // with camera tiles in a side strip
  if (hasScreenShare) {
    return (
      <section className="flex-1 flex flex-col lg:flex-row p-4 md:p-6 bg-muted/30 overflow-hidden gap-4">
        {/* Screen share - main large area */}
        <div className="flex-1 min-h-0 relative bg-black/5 rounded-2xl p-1">
          <div className="relative h-full w-full rounded-xl overflow-hidden shadow-sm">
            {screenShareTracks.map((trackRef) => (
              <ParticipantTile
                key={`screen-${trackRef.participant.identity}`}
                trackRef={trackRef}
                isScreenShare
              />
            ))}
            {/* Screen share badge */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-primary/90 text-primary-foreground px-2.5 py-1 rounded-md text-xs font-medium shadow-lg backdrop-blur-sm">
              <MonitorUp className="w-3.5 h-3.5" />
              Screen Share
            </div>
          </div>
        </div>

        {/* Camera tiles - side strip */}
        <div className="flex lg:flex-col gap-3 lg:w-56 xl:w-64 shrink-0 overflow-x-auto lg:overflow-y-auto pb-2 lg:pb-0 scrollbar-hide">
          {cameraTracks.map((trackRef) => (
            <div
              key={trackRef.participant.identity}
              className="w-40 h-28 lg:w-full lg:h-40 xl:h-48 shrink-0 snap-center"
            >
              <ParticipantTile trackRef={trackRef} />
            </div>
          ))}
        </div>
      </section>
    )
  }

  // No screen share — standard grid layout for camera tiles
  return (
    <section className="flex-1 p-4 md:p-6 bg-muted/30 overflow-hidden">
      <div
        className={`h-full w-full max-w-7xl mx-auto grid gap-4 p-2 ${
          cameraTracks.length <= 1
            ? "grid-cols-1 grid-rows-1"
            : cameraTracks.length <= 2
              ? "grid-cols-1 md:grid-cols-2 grid-rows-1"
              : cameraTracks.length <= 4
                ? "grid-cols-2 grid-rows-2"
                : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr"
        }`}
      >
        {cameraTracks.map((trackRef) => (
          <ParticipantTile
            key={trackRef.participant.identity}
            trackRef={trackRef}
          />
        ))}
      </div>
    </section>
  )
}
