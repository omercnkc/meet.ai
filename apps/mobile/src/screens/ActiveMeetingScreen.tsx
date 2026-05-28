/**
 * ActiveMeetingScreen — Live meeting view with direct livekit-client event handling,
 * completely avoiding @livekit/components-react hooks to prevent React context conflicts in monorepos.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  PermissionsAndroid,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing, typography, borderRadius } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { useTasks } from "../hooks/useTasks";
import { useTranslation } from "../utils/i18n";
import { useMessages } from "../hooks/useMessages";
import { useRecorder } from "../hooks/useRecorder";
import { LoadingState } from "../components/LoadingState";
import { TaskCard } from "../components/TaskCard";
import { ChatMessageBubble } from "../components/ChatMessageBubble";
import { AppButton } from "../components/AppButton";
import { subscribeToMeeting, endMeeting } from "../services/meetings";
import { createTask, updateTaskStatus, Task } from "../services/tasks";
import { sendMessage } from "../services/messages";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

import { Room, RoomEvent, Track } from "livekit-client";
import { VideoView, AudioSession } from "@livekit/react-native";
import { getLiveKitToken } from "../services/livekit";
import { ENV } from "../config/env";

const VIDEO_GAP = 4;
const MAX_PARTICIPANTS = 6;
const MEETING_MAX_MS = 60 * 60 * 1000; // 1 hour hard limit

const requestAndroidPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    const ok =
      granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
    if (!ok) Alert.alert("Permissions Required", "Camera and microphone access are required.", [{ text: "OK" }]);
    return ok;
  } catch {
    return false;
  }
};

function computeGrid(count: number, w: number, h: number) {
  const cols = count <= 1 ? 1 : 2;
  const rows = Math.ceil(count / cols);
  const cellW = cols > 1 ? (w - VIDEO_GAP * (cols - 1)) / cols : w;
  const cellH = rows > 1 ? (h - VIDEO_GAP * (rows - 1)) / rows : h;
  return { cols, cellW: Math.floor(cellW), cellH: Math.floor(cellH) };
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

type Props = NativeStackScreenProps<RootStackParamList, "ActiveMeeting">;
type TabKey = "meeting" | "tasks" | "chat";
type Participant = { identity: string; name: string };

export default function ActiveMeetingScreen({ route, navigation }: Props) {
  const { meetingId } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { currentUser, loading: authLoading } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const isCompact = screenWidth < 600;

  const btnSize = screenWidth < 360 ? 36 : 40;
  const btnRadius = btnSize / 2;
  const iconSize = screenWidth < 360 ? 16 : 18;
  const barGap = isCompact ? (screenWidth < 360 ? 4 : 8) : 12;
  const barPad = isCompact ? (screenWidth < 360 ? spacing.xs : spacing.sm) : spacing.md;

  const [meeting, setMeeting] = useState<any>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("meeting");

  const { tasks } = useTasks(meetingId);
  const { messages } = useMessages(meetingId);
  const { state: recState, elapsed: recElapsed, startRecording, stopRecording } = useRecorder(meetingId);

  // Task creation
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [taskAssignee, setTaskAssignee] = useState<{ id: string; name: string } | null>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);

  const [chatText, setChatText] = useState("");
  const chatListRef = useRef<FlatList>(null);

  // LiveKit state
  const [room, setRoom] = useState<Room | null>(null);
  const [videoTracks, setVideoTracks] = useState<any[]>([]);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set());
  const [meetingParticipants, setMeetingParticipants] = useState<Participant[]>([]);

  // Video stage measured size
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  const currentUserId = currentUser?.uid ?? (currentUser as any)?.userId;

  // ── Meeting subscription ──────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    const unsub = subscribeToMeeting(
      meetingId,
      (m) => {
        if (!alive) return;
        setMeeting(m);
        setLoadingMeeting(false);
        if (m?.status === "ended") navigation.replace("MeetingSummary", { meetingId });
      },
      (err) => {
        if (!alive) return;
        console.warn("[ActiveMeeting] subscription error:", err);
        setLoadingMeeting(false);
      }
    );
    return () => { alive = false; unsub(); };
  }, [meetingId]);

  // ── 1-hour meeting time limit ─────────────────────────────────────────
  useEffect(() => {
    if (!meeting?.createdAt) return;
    const startMs: number = meeting.createdAt.toMillis();
    const elapsed = Date.now() - startMs;
    const remaining = MEETING_MAX_MS - elapsed;

    if (remaining <= 0) {
      doEndMeeting();
      return;
    }

    let warnTimer: ReturnType<typeof setTimeout>;
    const warnMs = remaining - 5 * 60 * 1000;
    if (warnMs > 0) {
      warnTimer = setTimeout(() => {
        Alert.alert("Meeting ending soon", "This meeting will automatically end in 5 minutes.");
      }, warnMs);
    }
    const endTimer = setTimeout(doEndMeeting, remaining);

    return () => {
      clearTimeout(warnTimer!);
      clearTimeout(endTimer);
    };
  }, [meeting?.createdAt]);

  // ── LiveKit connection ────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !meetingId) return;
    let alive = true;
    let roomInst: Room | null = null;

    const refreshTracks = (r: Room) => {
      if (!alive) return;
      const tracks: any[] = [];
      for (const pub of r.localParticipant.videoTrackPublications.values()) {
        if (pub.videoTrack) tracks.push({ sid: pub.trackSid, track: pub.videoTrack, participant: r.localParticipant, source: pub.source });
      }
      for (const p of r.remoteParticipants.values()) {
        for (const pub of p.videoTrackPublications.values()) {
          if (pub.videoTrack) tracks.push({ sid: pub.trackSid, track: pub.videoTrack, participant: p, source: pub.source });
        }
      }
      setVideoTracks(tracks);
      setIsMicEnabled(r.localParticipant.isMicrophoneEnabled);
      setIsCameraEnabled(r.localParticipant.isCameraEnabled);
      setIsScreenSharing(r.localParticipant.isScreenShareEnabled);

      // Track participants for @mention
      const parts: Participant[] = [];
      parts.push({ identity: r.localParticipant.identity, name: r.localParticipant.name || r.localParticipant.identity });
      for (const p of r.remoteParticipants.values()) {
        parts.push({ identity: p.identity, name: p.name || p.identity });
      }
      setMeetingParticipants(parts);
    };

    (async () => {
      try {
        const identity = currentUser.uid ?? (currentUser as any).userId;
        const name = currentUser.displayName || currentUser.email?.split("@")[0] || "User";

        const ok = await requestAndroidPermissions();
        if (!ok && Platform.OS === "android") { if (alive) setIsConnecting(false); return; }

        const token = await getLiveKitToken(meetingId, identity, name);
        if (!alive) return;

        await AudioSession.startAudioSession();
        roomInst = new Room({ adaptiveStream: true, dynacast: true });

        const trackEvents = [
          RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed,
          RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished,
          RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected,
          RoomEvent.TrackMuted, RoomEvent.TrackUnmuted,
        ];
        trackEvents.forEach((ev) => roomInst!.on(ev, () => refreshTracks(roomInst!)));

        // Speaking detection
        roomInst.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          setSpeakingIds(new Set(speakers.map((s) => s.identity)));
        });

        await roomInst.connect(ENV.LIVEKIT_URL || "wss://meet-ai-79lby4wd.livekit.cloud", token);
        if (!alive) { roomInst.disconnect(); return; }

        setRoom(roomInst);
        setIsConnecting(false);
        refreshTracks(roomInst);
      } catch (err) {
        console.error("[LiveKit] connection failed:", err);
        if (alive) setIsConnecting(false);
      }
    })();

    return () => {
      alive = false;
      roomInst?.disconnect();
      AudioSession.stopAudioSession().catch(() => {});
    };
  }, [meetingId, currentUser]);

  // ── Controls ──────────────────────────────────────────────────────────
  const toggleMic = async () => {
    if (!room) return;
    try { await room.localParticipant.setMicrophoneEnabled(!isMicEnabled); setIsMicEnabled((v) => !v); }
    catch (e) { console.warn("mic toggle failed", e); }
  };

  const toggleCamera = async () => {
    if (!room) return;
    try { await room.localParticipant.setCameraEnabled(!isCameraEnabled); setIsCameraEnabled((v) => !v); }
    catch (e) { console.warn("camera toggle failed", e); }
  };

  const toggleScreenShare = async () => {
    if (!room) return;
    try {
      const next = !isScreenSharing;
      await room.localParticipant.setScreenShareEnabled(next);
      // Sync state with actual room state to avoid drift
      setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
    } catch (e: any) {
      Alert.alert("Screen share failed", e?.message || "Could not start screen sharing. See SCREENSHARE_FIX.md for setup instructions.");
    }
  };

  const handleRecordToggle = async () => {
    if (recState === "recording") { stopRecording(); }
    else if (recState === "idle" || recState === "error") { await startRecording(); }
  };

  const doEndMeeting = async () => {
    if (recState === "recording") stopRecording();
    try { await endMeeting(meetingId); navigation.replace("MeetingSummary", { meetingId }); }
    catch (err) { console.error("endMeeting failed", err); }
  };

  const handleLeave = () => {
    if (recState === "recording") stopRecording();
    navigation.navigate("Dashboard");
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      await createTask(
        meetingId,
        newTaskTitle.trim(),
        taskAssignee?.id ?? currentUserId,
        taskAssignee?.name ?? null
      );
      setNewTaskTitle("");
      setTaskAssignee(null);
    } catch (err) {
      console.error("addTask failed", err);
    } finally {
      setAddingTask(false);
    }
  };

  const handleTaskTitleChange = (text: string) => {
    setNewTaskTitle(text);
    if (text.endsWith("@")) setShowMentionPicker(true);
    else if (showMentionPicker) setShowMentionPicker(false);
  };

  const handleSelectAssignee = (p: Participant | "everyone") => {
    if (p === "everyone") {
      setTaskAssignee({ id: "everyone", name: "Everyone" });
    } else {
      setTaskAssignee({ id: p.identity, name: p.name });
    }
    setNewTaskTitle((prev) => prev.replace(/@$/, ""));
    setShowMentionPicker(false);
  };

  const handleSendChat = async () => {
    if (!chatText.trim() || !currentUser) return;
    const uid = currentUser.uid ?? (currentUser as any).userId;
    if (!uid) return;
    try {
      await sendMessage(meetingId, chatText.trim(), uid, currentUser.displayName || currentUser.email?.split("@")[0] || "User");
      setChatText("");
    } catch (err) { console.error("sendMessage failed", err); }
  };

  // ── Responsive video grid ─────────────────────────────────────────────
  const renderVideoGrid = useCallback(() => {
    const { w, h } = stageSize;
    if (!w || !h || !videoTracks.length) return null;

    const limited = videoTracks.slice(0, MAX_PARTICIPANTS);
    const { cols, cellW, cellH } = computeGrid(limited.length, w, h);

    const rowGroups: any[][] = [];
    for (let i = 0; i < limited.length; i += cols) rowGroups.push(limited.slice(i, i + cols));

    return (
      <View style={{ flex: 1 }}>
        {rowGroups.map((row, ri) => (
          <View
            key={ri}
            style={{ flexDirection: "row", gap: VIDEO_GAP, marginBottom: ri < rowGroups.length - 1 ? VIDEO_GAP : 0 }}
          >
            {row.map((item) => {
              const isSpeaking = speakingIds.has(item.participant.identity);
              const displayName = item.participant.name || item.participant.identity || "Participant";
              return (
                // Speaking: green padding acts as border (overflow:hidden would clip borderWidth)
                <View
                  key={item.sid}
                  style={{
                    width: cellW,
                    height: cellH,
                    borderRadius: borderRadius.lg,
                    padding: isSpeaking ? 2 : 0,
                    backgroundColor: isSpeaking ? "#22c55e" : "transparent",
                  }}
                >
                  <View style={{ flex: 1, borderRadius: borderRadius.lg, overflow: "hidden" }}>
                    <VideoView videoTrack={item.track} style={styles.videoStream} />
                    {/* Participant name tag */}
                    <View style={styles.nameTag}>
                      {isSpeaking && <View style={styles.speakDot} />}
                      <Text style={styles.nameTagText} numberOfLines={1}>
                        {displayName}
                        {item.source === Track.Source.ScreenShare ? " (Screen)" : ""}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
            {row.length < cols && <View style={{ width: cellW, height: cellH }} />}
          </View>
        ))}
      </View>
    );
  }, [stageSize, videoTracks, speakingIds]);

  // ── Guard ─────────────────────────────────────────────────────────────
  if (authLoading || loadingMeeting || isConnecting || !meeting) {
    return <LoadingState message="Connecting to meeting room..." />;
  }

  const isHost = (meeting?.hostId || meeting?.userId) === currentUserId;
  const isRecBusy = recState === "stopping" || recState === "uploading";

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "meeting", label: "Live",  icon: "videocam-outline" },
    { key: "tasks",   label: "Tasks", icon: "checkbox-outline" },
    { key: "chat",    label: "Chat",  icon: "chatbubble-outline" },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {meeting?.title || "Meeting"}
          </Text>
          <View style={[styles.activeBadge, { backgroundColor: "#22c55e1A", borderColor: "#22c55e33" }]}>
            <Text style={[styles.activeBadgeText, { color: "#22c55e" }]}>{t("active")}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Tab bar ── */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border + "40" }]}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, active && { borderBottomColor: colors.primary }]}
            >
              <Ionicons
                name={active ? (tab.icon.replace("-outline", "") as any) : tab.icon}
                size={20}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.mutedForeground }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>

        {/* ── LIVE TAB ── */}
        {activeTab === "meeting" && (
          <View style={styles.meetingView}>

            {/* Video stage */}
            <View
              style={styles.videoStage}
              onLayout={(e) => setStageSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
            >
              {videoTracks.length === 0 ? (
                <View style={[styles.placeholder, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="videocam-off-outline" size={48} color={colors.mutedForeground} />
                  <Text style={[styles.placeholderTitle, { color: colors.mutedForeground }]}>No active cameras</Text>
                  <Text style={[styles.placeholderSub, { color: colors.mutedForeground }]}>
                    Turn on your camera or wait for others to join.
                  </Text>
                </View>
              ) : (
                renderVideoGrid()
              )}

              {/* Recording indicator overlay */}
              {recState !== "idle" && (
                <View style={styles.recOverlay} pointerEvents="none">
                  <View style={[styles.recBadge, recState === "uploaded" && styles.recBadgeSuccess]}>
                    {recState === "recording" && (
                      <><View style={styles.recDot} /><Text style={styles.recBadgeText}>REC {fmtTime(recElapsed)}</Text></>
                    )}
                    {recState === "stopping"  && <Text style={styles.recBadgeText}>Stopping...</Text>}
                    {recState === "uploading" && <Text style={styles.recBadgeText}>Uploading...</Text>}
                    {recState === "uploaded"  && <Text style={[styles.recBadgeText, { color: "#22c55e" }]}>✓ Saved</Text>}
                    {recState === "error"     && <Text style={[styles.recBadgeText, { color: "#ef4444" }]}>⚠ Rec Error</Text>}
                  </View>
                </View>
              )}
            </View>

            {/* Control bar */}
            <View style={[styles.controlBar, { backgroundColor: colors.card, borderColor: colors.border + "30", paddingHorizontal: barPad, gap: barGap }]}>

              <TouchableOpacity onPress={toggleMic}
                style={[styles.roundBtn, { width: btnSize, height: btnSize, borderRadius: btnRadius }, isMicEnabled ? { backgroundColor: colors.secondary } : { backgroundColor: colors.destructive }]}>
                <Ionicons name={isMicEnabled ? "mic" : "mic-off"} size={iconSize} color={isMicEnabled ? colors.foreground : "#fff"} />
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleCamera}
                style={[styles.roundBtn, { width: btnSize, height: btnSize, borderRadius: btnRadius }, isCameraEnabled ? { backgroundColor: colors.secondary } : { backgroundColor: colors.destructive }]}>
                <Ionicons name={isCameraEnabled ? "videocam" : "videocam-off"} size={iconSize} color={isCameraEnabled ? colors.foreground : "#fff"} />
              </TouchableOpacity>

              {Platform.OS === "android" && (
                <TouchableOpacity onPress={toggleScreenShare}
                  style={[styles.roundBtn, { width: btnSize, height: btnSize, borderRadius: btnRadius }, isScreenSharing ? { backgroundColor: colors.primary } : { backgroundColor: colors.secondary }]}>
                  <Ionicons name="desktop" size={iconSize} color={isScreenSharing ? "#fff" : colors.foreground} />
                </TouchableOpacity>
              )}

              {/* Record */}
              <TouchableOpacity onPress={handleRecordToggle} disabled={isRecBusy}
                style={[
                  isCompact ? styles.roundBtn : styles.wideBtn,
                  isCompact && { width: btnSize, height: btnSize, borderRadius: btnRadius },
                  { backgroundColor: colors.secondary },
                  recState === "recording" && { borderColor: colors.destructive, borderWidth: 1 },
                  recState === "uploaded"  && { borderColor: "#22c55e", borderWidth: 1 },
                  isRecBusy && { opacity: 0.5 },
                ]}
              >
                {recState === "recording" ? (
                  <><View style={[styles.recDotBtn, { backgroundColor: colors.destructive }]} />{!isCompact && <Text style={[styles.wideBtnText, { color: colors.destructive }]}>{fmtTime(recElapsed)}</Text>}</>
                ) : recState === "stopping" ? (
                  <><Ionicons name="hourglass-outline" size={iconSize} color={colors.mutedForeground} />{!isCompact && <Text style={[styles.wideBtnText, { color: colors.mutedForeground }]}>Stopping</Text>}</>
                ) : recState === "uploading" ? (
                  <><Ionicons name="cloud-upload-outline" size={iconSize} color={colors.primary} />{!isCompact && <Text style={[styles.wideBtnText, { color: colors.primary }]}>Uploading</Text>}</>
                ) : recState === "uploaded" ? (
                  <><Ionicons name="checkmark-circle-outline" size={iconSize} color="#22c55e" />{!isCompact && <Text style={[styles.wideBtnText, { color: "#22c55e" }]}>Saved</Text>}</>
                ) : recState === "error" ? (
                  <><Ionicons name="alert-circle-outline" size={iconSize} color={colors.destructive} />{!isCompact && <Text style={[styles.wideBtnText, { color: colors.destructive }]}>Retry</Text>}</>
                ) : (
                  <><View style={[styles.recDotBtn, { backgroundColor: colors.destructive }]} />{!isCompact && <Text style={[styles.wideBtnText, { color: colors.foreground }]}>Record</Text>}</>
                )}
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border + "60" }]} />

              <TouchableOpacity onPress={handleLeave}
                style={[isCompact ? styles.roundBtn : styles.wideBtn, isCompact && { width: btnSize, height: btnSize, borderRadius: btnRadius }, { backgroundColor: colors.secondary }]}>
                {isCompact
                  ? <Ionicons name="log-out" size={iconSize} color={colors.foreground} />
                  : <Text style={[styles.wideBtnText, { color: colors.foreground }]}>Leave</Text>}
              </TouchableOpacity>

              {isHost && (
                <TouchableOpacity onPress={doEndMeeting}
                  style={[isCompact ? styles.roundBtn : styles.wideBtn, isCompact && { width: btnSize, height: btnSize, borderRadius: btnRadius }, { backgroundColor: colors.destructive }]}>
                  <Ionicons name="call" size={iconSize} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
                  {!isCompact && <Text style={[styles.wideBtnText, { color: "#fff" }]}>End</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── TASKS TAB ── */}
        {activeTab === "tasks" && (
          <View style={styles.flex}>
            {/* Task input with @mention */}
            <View style={styles.taskInputSection}>
              <View style={styles.taskInputRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
                  placeholder='Add a task... (type @ to assign)'
                  placeholderTextColor={colors.mutedForeground}
                  value={newTaskTitle}
                  onChangeText={handleTaskTitleChange}
                />
                <AppButton title="Add" size="sm" onPress={handleAddTask} loading={addingTask} disabled={!newTaskTitle.trim()} />
              </View>

              {/* Assignee chip */}
              {taskAssignee && (
                <View style={styles.assigneeRow}>
                  <Ionicons name="person" size={12} color={colors.primary} />
                  <Text style={[styles.assigneeText, { color: colors.primary }]}>{taskAssignee.name}</Text>
                  <TouchableOpacity onPress={() => setTaskAssignee(null)}>
                    <Ionicons name="close-circle" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              )}

              {/* @mention picker */}
              {showMentionPicker && (
                <View style={[styles.mentionBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.mentionItem, { borderBottomColor: colors.border + "40" }]}
                    onPress={() => handleSelectAssignee("everyone")}
                  >
                    <Ionicons name="people" size={16} color={colors.primary} />
                    <Text style={[styles.mentionName, { color: colors.foreground }]}>Everyone</Text>
                  </TouchableOpacity>
                  {meetingParticipants.map((p) => (
                    <TouchableOpacity
                      key={p.identity}
                      style={[styles.mentionItem, { borderBottomColor: colors.border + "40" }]}
                      onPress={() => handleSelectAssignee(p)}
                    >
                      <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
                      <Text style={[styles.mentionName, { color: colors.foreground }]}>{p.name}</Text>
                      {p.identity === currentUserId && (
                        <Text style={[styles.mentionYou, { color: colors.mutedForeground }]}>(you)</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <FlatList
              data={tasks}
              renderItem={({ item }) => (
                <TaskCard
                  task={item}
                  onToggle={(t: Task) => updateTaskStatus(t.id, t.status === "done" ? "open" : "done")}
                  currentUserId={currentUserId}
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No tasks yet. Add one above!</Text>}
            />
          </View>
        )}

        {/* ── CHAT TAB ── */}
        {activeTab === "chat" && (
          <View style={styles.flex}>
            <FlatList
              ref={chatListRef}
              data={messages}
              renderItem={({ item }) => (
                <ChatMessageBubble
                  text={item.text}
                  senderName={item.senderName}
                  isOwn={item.senderId === currentUserId}
                  timestamp={item.createdAt?.toDate() || null}
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.chatContent}
              onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No messages yet. Say hello!</Text>}
            />
            <View style={[styles.chatInputRow, { borderTopColor: colors.border + "40" }]}>
              <TextInput
                style={[styles.chatInput, { backgroundColor: colors.secondary, color: colors.foreground }]}
                placeholder="Type a message..."
                placeholderTextColor={colors.mutedForeground}
                value={chatText}
                onChangeText={setChatText}
                multiline
              />
              <TouchableOpacity onPress={handleSendChat} disabled={!chatText.trim()}>
                <Ionicons name="send" size={22} color={chatText.trim() ? colors.primary : colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex:      { flex: 1 },

  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  backBtn:       { padding: 4 },
  titleRow:      { flex: 1, marginHorizontal: spacing.md, alignItems: "center" },
  title:         { ...typography.h3, flex: 1 },
  activeBadge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full, borderWidth: 1, marginTop: 2 },
  activeBadgeText: { fontSize: 10, fontWeight: "bold" },

  tabBar: { flexDirection: "row", height: 48, borderBottomWidth: 1 },
  tab:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontSize: 13, fontWeight: "600" },

  meetingView: { flex: 1, padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md },
  videoStage:  { flex: 1, position: "relative" },
  videoStream: { width: "100%", height: "100%" },

  // Participant name tag
  nameTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    maxWidth: "85%",
  },
  nameTagText: { color: "#fff", fontSize: 12, fontWeight: "600", flexShrink: 1 },
  speakDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },

  placeholder:      { flex: 1, borderRadius: borderRadius.xl, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  placeholderTitle: { ...typography.h3, marginTop: spacing.md },
  placeholderSub:   { ...typography.bodySmall, textAlign: "center", marginTop: 4 },

  // Recording overlay
  recOverlay:     { position: "absolute", top: 8, left: 8, zIndex: 10 },
  recBadge:       { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.full, gap: 6 },
  recBadgeSuccess:{ backgroundColor: "rgba(34,197,94,0.2)" },
  recDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  recBadgeText:   { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Control bar
  controlBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  roundBtn:   { alignItems: "center", justifyContent: "center" },
  wideBtn:    { height: 40, paddingHorizontal: spacing.md, borderRadius: borderRadius.full, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  wideBtnText:{ fontSize: 13, fontWeight: "600" },
  recDotBtn:  { width: 8, height: 8, borderRadius: 4 },
  divider:    { width: 1, height: 24, marginHorizontal: 4 },

  // Tasks
  taskInputSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  taskInputRow:     { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  assigneeRow:      { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.xs, paddingHorizontal: 4 },
  assigneeText:     { fontSize: 12, fontWeight: "500", flex: 1 },

  // @mention picker
  mentionBox: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xs,
    maxHeight: 180,
    overflow: "hidden",
  },
  mentionItem: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, gap: spacing.sm },
  mentionName: { ...typography.bodySmall, flex: 1 },
  mentionYou:  { ...typography.caption },

  input:       { flex: 1, height: 40, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, fontSize: 14 },
  listContent: { padding: spacing.lg, paddingBottom: 100 },
  emptyText:   { ...typography.bodySmall, textAlign: "center", marginTop: spacing["5xl"] },

  chatContent:  { paddingVertical: spacing.lg },
  chatInputRow: { flexDirection: "row", alignItems: "flex-end", padding: spacing.md, borderTopWidth: 1, gap: spacing.md },
  chatInput:    { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: borderRadius.xl, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, fontSize: 14 },
});
