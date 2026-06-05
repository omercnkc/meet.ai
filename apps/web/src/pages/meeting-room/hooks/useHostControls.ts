import { useEffect, useCallback, useState, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const NODE_API_URL =
  (import.meta.env.VITE_NODE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:3001";

type ApiResult = { success: boolean; error?: string; mutedCount?: number };

export function useHostControls({
  meetingId,
  hostId,
  currentUserId,
  onScreenShareStop,
}: {
  meetingId: string;
  hostId: string;
  currentUserId?: string;
  onScreenShareStop?: () => void;
}) {
  const room = useRoomContext();
  const navigate = useNavigate();
  const kickedRef = useRef(false);       // set on HOST_KICKED to suppress the Disconnected handler
  const mountedRef = useRef(true);       // cleared on unmount to suppress stale Disconnected events
  const [isForceMutedByHost, setIsForceMutedByHost] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!room || !currentUserId) return;

    const handleDisconnected = () => {
      // Ignore if: component is unmounting (user left) OR participant was explicitly kicked
      if (!mountedRef.current || kickedRef.current) return;
      toast.error("You were disconnected from the meeting.");
      navigate("/dashboard");
    };

    const handleData = (payload: Uint8Array, _p: unknown, _k: unknown, topic?: string) => {
      if (topic !== "host-control") return;
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as {
          type: string;
          payload: { targetUserId?: string; newHostId?: string; previousHostId?: string };
        };
        const p = msg.payload;

        switch (msg.type) {
          case "HOST_KICKED":
            if (p.targetUserId === currentUserId) {
              kickedRef.current = true;
              toast.error("You have been removed from the meeting by the host.", { duration: 3000 });
              setTimeout(() => navigate("/dashboard"), 1000);
            }
            break;
          case "HOST_MUTED":
            if (p.targetUserId === currentUserId || p.targetUserId === "*") {
              setIsForceMutedByHost(true);
              toast.warning("The host has muted your microphone. You cannot unmute until the host allows it.");
            }
            break;
          case "UNMUTE_REQUESTED":
            if (p.targetUserId === currentUserId) {
              setIsForceMutedByHost(false);
              toast("The host is asking you to unmute.", {
                action: {
                  label: "Unmute",
                  onClick: () => room.localParticipant.setMicrophoneEnabled(true),
                },
                duration: 12000,
              });
            }
            break;
          case "SCREEN_SHARE_STOPPED":
            if (p.targetUserId === currentUserId) {
              onScreenShareStop?.();
              toast.warning("The host has stopped your screen share.");
            }
            break;
          case "HOST_TRANSFERRED":
            if (p.newHostId === currentUserId) {
              toast.success("You are now the host of this meeting.");
            } else if (p.previousHostId === currentUserId) {
              toast("You have transferred the host role.");
            }
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    room.on(RoomEvent.Disconnected, handleDisconnected);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room, currentUserId, navigate, onScreenShareStop]);

  const post = useCallback(
    async (endpoint: string, body: Record<string, unknown>): Promise<ApiResult> => {
      const res = await fetch(`${NODE_API_URL}/api/host-controls/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, meetingId, callerId: currentUserId, hostId }),
      });
      return res.json();
    },
    [meetingId, currentUserId, hostId]
  );

  const kick = useCallback(
    (targetUserId: string, reason?: string) => post("kick", { targetUserId, reason }),
    [post]
  );
  const mute = useCallback((targetUserId: string) => post("mute", { targetUserId }), [post]);
  const requestUnmute = useCallback(
    (targetUserId: string) => post("request-unmute", { targetUserId }),
    [post]
  );
  const stopScreenShare = useCallback(
    (targetUserId: string) => post("stop-screenshare", { targetUserId }),
    [post]
  );
  const muteAll = useCallback(() => post("mute-all", {}), [post]);
  const transferHost = useCallback(
    (newHostId: string) => post("transfer-host", { newHostId }),
    [post]
  );

  return { kick, mute, requestUnmute, stopScreenShare, muteAll, transferHost, isForceMutedByHost };
}
