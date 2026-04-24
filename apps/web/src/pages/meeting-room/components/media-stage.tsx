import { useTracks } from "@livekit/components-react"
import { Track } from "livekit-client"
import { ParticipantTile } from "./participant-tile"

export function MediaStage() {
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  )

  return (
    <section className="flex-1 p-4 md:p-6 bg-muted/30 overflow-hidden">
      <div
        className={`h-full grid gap-4 auto-rows-fr ${
          cameraTracks.length <= 1
            ? "grid-cols-1"
            : cameraTracks.length <= 4
              ? "grid-cols-2"
              : "grid-cols-3"
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
