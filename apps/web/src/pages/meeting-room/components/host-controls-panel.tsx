import { useCallback } from "react";
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { Mic, MicOff, Monitor, MonitorOff, PhoneOff, Users, Volume2, X } from "lucide-react";
import { toast } from "sonner";

type ApiResult = { success: boolean; error?: string; mutedCount?: number };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  kick: (targetUserId: string) => Promise<ApiResult>;
  mute: (targetUserId: string) => Promise<ApiResult>;
  requestUnmute: (targetUserId: string) => Promise<ApiResult>;
  stopScreenShare: (targetUserId: string) => Promise<ApiResult>;
  muteAll: () => Promise<ApiResult>;
}

export function HostControlsPanel({
  isOpen,
  onClose,
  currentUserId,
  kick,
  mute,
  requestUnmute,
  stopScreenShare,
  muteAll,
}: Props) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const run = useCallback(
    async (fn: () => Promise<ApiResult>, successMsg: string) => {
      try {
        const res = await fn();
        if (res.success) toast.success(successMsg);
        else toast.error(res.error || "Action failed");
      } catch {
        toast.error("Network error");
      }
    },
    []
  );

  if (!isOpen) return null;

  const allParticipants = [localParticipant, ...remoteParticipants];

  return (
    <>
      {/* Invisible backdrop to close on outside click */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-16 bottom-0 z-50 w-72 bg-card border-l border-border/40 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Participants ({allParticipants.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {remoteParticipants.length > 0 && (
              <button
                onClick={() =>
                  run(muteAll, `${remoteParticipants.length} participant(s) muted`)
                }
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-medium hover:bg-amber-500/20 transition-colors"
              >
                <Volume2 className="w-3 h-3" />
                Mute All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Participant list */}
        <div className="flex-1 overflow-y-auto">
          {allParticipants.map((p) => {
            const isMe = p.identity === currentUserId;
            const isMicOn = p.isMicrophoneEnabled;
            const isCamOn = p.isCameraEnabled;
            const isSharing = p.isScreenShareEnabled;

            return (
              <div
                key={p.identity}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-border/20 hover:bg-accent/20 transition-colors"
              >
                {/* Avatar initial */}
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center shrink-0">
                  {(p.name || p.identity).charAt(0).toUpperCase()}
                </div>

                {/* Name + track status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.name || p.identity}
                    {isMe && (
                      <span className="text-muted-foreground font-normal text-xs ml-1">(you)</span>
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isMicOn
                      ? <Mic className="w-3 h-3 text-green-500" />
                      : <MicOff className="w-3 h-3 text-red-400" />
                    }
                    {isCamOn
                      ? <Monitor className="w-3 h-3 text-green-500" />
                      : <MonitorOff className="w-3 h-3 text-muted-foreground/40" />
                    }
                    {isSharing && (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        Screen
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons (not for the host themselves) */}
                {!isMe && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {isMicOn ? (
                      <button
                        onClick={() => run(() => mute(p.identity), `${p.name || p.identity} muted`)}
                        title="Mute participant"
                        className="p-1.5 rounded hover:bg-amber-500/15 hover:text-amber-500 text-muted-foreground transition-colors"
                      >
                        <MicOff className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => run(() => requestUnmute(p.identity), "Unmute request sent")}
                        title="Request unmute"
                        className="p-1.5 rounded hover:bg-green-500/15 hover:text-green-500 text-muted-foreground transition-colors"
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isSharing && (
                      <button
                        onClick={() => run(() => stopScreenShare(p.identity), "Screen share stopped")}
                        title="Stop screen share"
                        className="p-1.5 rounded hover:bg-amber-500/15 hover:text-amber-500 text-muted-foreground transition-colors"
                      >
                        <MonitorOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => run(() => kick(p.identity), `${p.name || p.identity} removed`)}
                      title="Remove from meeting"
                      className="p-1.5 rounded hover:bg-destructive/15 hover:text-destructive text-muted-foreground transition-colors"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
