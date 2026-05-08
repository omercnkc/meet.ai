import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { VideoView, useRoom, useLocalParticipant, useParticipants } from "@livekit/react-native";
import { Track } from "livekit-client";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing, typography, borderRadius } from "../theme";
import { useTranslation } from "../utils/i18n";
import { LoadingState } from "./LoadingState";

interface Props {
  url: string;
  token: string;
  onLeave: () => void;
  onEndMeeting?: () => void;
}

export function MeetingLiveView({ url, token, onLeave, onEndMeeting }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { room } = useRoom({}) as any;
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const isConnecting = room?.state === "connecting";

  useEffect(() => {
    if (token && url && room) {
      room.connect(url, token).catch((err: any) => console.error("LiveKit connect error:", err));
    }
    return () => {
      room?.disconnect();
    };
  }, [token, url, room]);

  if (isConnecting) return <LoadingState message={t("connecting")} fullScreen={false} />;

  const toggleMic = () => localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled);
  const toggleCam = () => localParticipant?.setCameraEnabled(!isCameraEnabled);

  const renderParticipant = (p: any, isLocal = false) => {
    const cameraPub = p.getTrackPublication(Track.Source.Camera);
    const micPub = p.getTrackPublication(Track.Source.Microphone);
    const hasVideo = cameraPub?.isSubscribed && !cameraPub?.isMuted;
    const isMuted = !micPub || micPub.isMuted;

    return (
      <View key={p.sid || "local"} style={[styles.participantCard, { backgroundColor: colors.secondary }]}>
        {hasVideo ? (
          <VideoView 
            {...({
              trackRef: {
                participant: p,
                publication: cameraPub,
                source: Track.Source.Camera
              }
            } as any)} 
            style={styles.video} 
          />
        ) : (
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color={colors.mutedForeground} />
          </View>
        )}
        <View style={styles.nameBadge}>
          <Text style={styles.nameText} numberOfLines={1}>
            {isLocal ? t("you") : p.identity || "Participant"}
          </Text>
          {isMuted && <Ionicons name="mic-off" size={14} color="#ef4444" style={{ marginLeft: 4 }} />}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.stage}>
        {localParticipant && renderParticipant(localParticipant, true)}
        {participants.map((p) => renderParticipant(p))}
      </ScrollView>

      {/* Control Bar */}
      <View style={[styles.controls, { backgroundColor: colors.background, borderTopColor: colors.border + "40" }]}>
        <TouchableOpacity
          onPress={toggleMic}
          style={[styles.controlBtn, !isMicrophoneEnabled && styles.controlBtnOff]}
        >
          <Ionicons
            name={isMicrophoneEnabled ? "mic" : "mic-off"}
            size={24}
            color={isMicrophoneEnabled ? colors.foreground : "#fff"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleCam}
          style={[styles.controlBtn, !isCameraEnabled && styles.controlBtnOff]}
        >
          <Ionicons
            name={isCameraEnabled ? "videocam" : "videocam-off"}
            size={24}
            color={isCameraEnabled ? colors.foreground : "#fff"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, { opacity: 0.5 }]}
          onPress={() => alert("Recording is currently only supported on the web version.")}
        >
          <Ionicons name="radio-button-on" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={styles.separator} />

        <TouchableOpacity onPress={onLeave} style={[styles.controlBtn, styles.leaveBtn]}>
          <Ionicons name="log-out-outline" size={24} color={colors.foreground} />
          <Text style={styles.btnLabel}>{t("leave")}</Text>
        </TouchableOpacity>

        {onEndMeeting && (
          <TouchableOpacity onPress={onEndMeeting} style={[styles.controlBtn, styles.endBtn]}>
            <Ionicons name="phone-portrait-outline" size={24} color="#fff" />
            <Text style={[styles.btnLabel, { color: "#fff" }]}>{t("endMeeting")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  errorText: { ...typography.h3, marginTop: spacing.md },
  errorSubtext: { ...typography.bodySmall, textAlign: "center", marginTop: spacing.xs },
  stage: {
    padding: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  participantCard: {
    width: (Dimensions.get("window").width - spacing.md * 3) / 2,
    aspectRatio: 1.2,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  video: { width: "100%", height: "100%" },
  avatar: { flex: 1, alignItems: "center", justifyContent: "center" },
  nameBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  nameText: { color: "#fff", fontSize: 11, fontWeight: "600", flex: 1 },
  controls: {
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    flexWrap: "wrap",
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  controlBtnOff: { backgroundColor: "#ef4444" },
  leaveBtn: { width: "auto", paddingHorizontal: spacing.md, borderRadius: borderRadius.full, flexDirection: "row", gap: 6 },
  endBtn: {
    width: "auto",
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#ef4444",
  },
  btnLabel: { fontSize: 11, fontWeight: "700" },
  separator: { width: 1, height: 24, backgroundColor: "rgba(0,0,0,0.1)", marginHorizontal: 4 },
});
