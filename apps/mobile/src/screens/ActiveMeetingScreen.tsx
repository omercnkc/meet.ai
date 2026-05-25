/**
 * ActiveMeetingScreen — Live meeting view with direct livekit-client event handling,
 * completely avoiding @livekit/components-react hooks to prevent React context conflicts in monorepos.
 */

import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing, typography, borderRadius } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { useTasks } from "../hooks/useTasks";
import { useTranslation } from "../utils/i18n";
import { useMessages } from "../hooks/useMessages";
import { LoadingState } from "../components/LoadingState";
import { TaskCard } from "../components/TaskCard";
import { MeetingLiveView } from "../components/MeetingLiveView";
import { ChatMessageBubble } from "../components/ChatMessageBubble";
import { AppButton } from "../components/AppButton";
import { subscribeToMeeting, endMeeting } from "../services/meetings";
import { createTask, updateTaskStatus, Task } from "../services/tasks";
import { sendMessage } from "../services/messages";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

// LiveKit SDK & Native audio/video
import { Room, RoomEvent, Track } from "livekit-client";
import { VideoView, AudioSession } from "@livekit/react-native";
import { getLiveKitToken } from "../services/livekit";
import { ENV } from "../config/env";

const requestAndroidPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    const cameraGranted =
      granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
    const audioGranted =
      granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;

    console.log("[Permissions] Android Camera granted:", cameraGranted, "Audio granted:", audioGranted);

    if (!cameraGranted || !audioGranted) {
      Alert.alert(
        "Permissions Required",
        "This app requires camera and microphone permissions to join the meeting room.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Permissions] Android permission request error:", err);
    return false;
  }
};

type Props = NativeStackScreenProps<RootStackParamList, "ActiveMeeting">;
type TabKey = "meeting" | "tasks" | "chat";

export default function ActiveMeetingScreen({ route, navigation }: Props) {
  const { meetingId } = route.params;
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { currentUser, loading: authLoading } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const isCompact = screenWidth < 600;

  // Responsive button sizing
  const buttonSize = screenWidth < 360 ? 36 : 40;
  const buttonRadius = buttonSize / 2;
  const iconSize = screenWidth < 360 ? 16 : 18;
  const barGap = isCompact ? (screenWidth < 360 ? 4 : 8) : 12;
  const barPadding = isCompact ? (screenWidth < 360 ? spacing.xs : spacing.sm) : spacing.md;

  const [meeting, setMeeting] = useState<any>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("meeting");
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const { tasks } = useTasks(meetingId);
  const { messages } = useMessages(meetingId);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [chatText, setChatText] = useState("");
  const chatListRef = useRef<FlatList>(null);

  // LiveKit Connection & Video Tracks States
  const [room, setRoom] = useState<Room | null>(null);
  const [videoTracks, setVideoTracks] = useState<any[]>([]);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnectingLiveKit, setIsConnectingLiveKit] = useState(true);

  // Recording Timer State
  const [recordingState, setRecordingState] = useState<"idle" | "recording">("idle");
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const recordingTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // 1. Subscribe to meeting status in Firestore
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToMeeting(
      meetingId,
      (m) => {
        if (!isMounted) return;
        setMeeting(m);
        setLoadingMeeting(false);
        if (m?.status === "ended") {
          navigation.replace("MeetingSummary", { meetingId });
          return;
        }
      },
      (err) => {
        if (!isMounted) return;
        console.warn("[ActiveMeetingScreen] subscribeToMeeting error:", err);
        setLoadingMeeting(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [meetingId]);

  // 2. Connect to LiveKit Room and attach vanilla event listeners
  useEffect(() => {
    const user = currentUser;
    if (!user || !meetingId) return;

    let isMounted = true;
    let roomInstance: Room | null = null;

    const updateTracks = (r: Room) => {
      if (!isMounted) return;
      const tracksList: any[] = [];
      
      // Local Camera / Screen Share
      for (const pub of r.localParticipant.videoTrackPublications.values()) {
        if (pub.videoTrack) {
          tracksList.push({
            sid: pub.trackSid,
            track: pub.videoTrack,
            participant: r.localParticipant,
            source: pub.source,
          });
        }
      }

      // Remote Camera / Screen Share
      for (const p of r.remoteParticipants.values()) {
        for (const pub of p.videoTrackPublications.values()) {
          if (pub.videoTrack) {
            tracksList.push({
              sid: pub.trackSid,
              track: pub.videoTrack,
              participant: p,
              source: pub.source,
            });
          }
        }
      }

      setVideoTracks(tracksList);

      // Sync local participant's media track state with UI controls
      setIsMicEnabled(r.localParticipant.isMicrophoneEnabled);
      setIsCameraEnabled(r.localParticipant.isCameraEnabled);
      setIsScreenSharing(r.localParticipant.isScreenShareEnabled);
    };

    async function startLiveKit() {
      if (!user) return;
      try {
        const identity = user.uid ?? (user as any).userId;
        const name = user.displayName || user.email?.split("@")[0] || "User";
        
        // Request Android camera and record audio permissions at runtime
        const permissionsGranted = await requestAndroidPermissions();
        if (!permissionsGranted && Platform.OS === "android") {
          if (isMounted) {
            setIsConnectingLiveKit(false);
          }
          return;
        }

        const token = await getLiveKitToken(meetingId, identity, name);
        if (!isMounted) return;

        // Start mobile native audio focus session
        await AudioSession.startAudioSession();

        roomInstance = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        // Set up vanilla events to refresh state when tracks/participants change
        roomInstance.on(RoomEvent.TrackSubscribed, () => updateTracks(roomInstance!));
        roomInstance.on(RoomEvent.TrackUnsubscribed, () => updateTracks(roomInstance!));
        roomInstance.on(RoomEvent.LocalTrackPublished, () => updateTracks(roomInstance!));
        roomInstance.on(RoomEvent.LocalTrackUnpublished, () => updateTracks(roomInstance!));
        roomInstance.on(RoomEvent.ParticipantConnected, () => updateTracks(roomInstance!));
        roomInstance.on(RoomEvent.ParticipantDisconnected, () => updateTracks(roomInstance!));
        roomInstance.on(RoomEvent.TrackMuted, () => updateTracks(roomInstance!));
        roomInstance.on(RoomEvent.TrackUnmuted, () => updateTracks(roomInstance!));

        const serverUrl = ENV.LIVEKIT_URL || "wss://meet-ai-79lby4wd.livekit.cloud";
        await roomInstance.connect(serverUrl, token);

        if (!isMounted) {
          roomInstance.disconnect();
          return;
        }

        setRoom(roomInstance);
        setIsConnectingLiveKit(false);
        updateTracks(roomInstance);

      } catch (err) {
        console.error("[LiveKit] Vanilla room connection failed:", err);
        if (isMounted) {
          setIsConnectingLiveKit(false);
        }
      }
    }

    startLiveKit();

    return () => {
      isMounted = false;
      if (roomInstance) {
        roomInstance.disconnect();
      }
      AudioSession.stopAudioSession().catch((e: any) => console.log("AudioSession stop error", e));
    };
  }, [meetingId, currentUser]);

  // Hardware control functions using vanilla SDK calls
  const toggleMic = async () => {
    if (!room) return;
    try {
      const nextState = !isMicEnabled;
      await room.localParticipant.setMicrophoneEnabled(nextState);
      setIsMicEnabled(nextState);
    } catch (e) {
      console.warn("Failed to toggle microphone", e);
    }
  };

  const toggleCamera = async () => {
    if (!room) return;
    try {
      const nextState = !isCameraEnabled;
      await room.localParticipant.setCameraEnabled(nextState);
      setIsCameraEnabled(nextState);
    } catch (e) {
      console.warn("Failed to toggle camera", e);
    }
  };

  const toggleScreenShare = async () => {
    if (!room) return;
    try {
      const nextState = !isScreenSharing;
      await room.localParticipant.setScreenShareEnabled(nextState);
      setIsScreenSharing(nextState);
    } catch (e) {
      console.warn("Failed to toggle screen share", e);
    }
  };

  const handleRecordToggle = () => {
    if (recordingState === "idle") {
      setRecordingState("recording");
      setRecordingElapsed(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingState("idle");
    }
  };

  const handleLeave = () => {
    navigation.navigate("Dashboard");
  };

  const formatElapsed = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleEndMeeting = async () => {
    try {
      await endMeeting(meetingId);
      navigation.replace("MeetingSummary", { meetingId });
    } catch (err) {
      console.error("Failed to end meeting", err);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      await createTask(meetingId, newTaskTitle.trim(), currentUser?.uid);
      setNewTaskTitle("");
    } catch (err) {
      console.error("Failed to add task", err);
    } finally {
      setAddingTask(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatText.trim() || !currentUser) return;
    const uid = currentUser.uid ?? (currentUser as any).userId;
    if (!uid) return;
    try {
      await sendMessage(
        meetingId,
        chatText.trim(),
        uid,
        currentUser.displayName || currentUser.email?.split("@")[0] || "User"
      );
      setChatText("");
    } catch (err) {
      console.error("Failed to send chat", err);
    }
  };

  if (authLoading || loadingMeeting || isConnectingLiveKit || !meeting) {
    return <LoadingState message="Connecting to meeting room..." />;
  }

  const userId = currentUser?.uid ?? (currentUser as any)?.userId;
  const isHost = (meeting?.hostId || meeting?.userId) === userId;

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "meeting", label: "Live", icon: "videocam-outline" },
    { key: "tasks", label: "Tasks", icon: "checkbox-outline" },
    { key: "chat", label: "Chat", icon: "chatbubble-outline" },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {meeting?.title || "Meeting"}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: "#22c55e1A", borderColor: "#22c55e33" }]}>
            <Text style={[styles.statusText, { color: "#22c55e" }]}>{t("active")}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border + "40" }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, isActive && { borderBottomColor: colors.primary }]}
            >
              <Ionicons
                name={isActive ? (tab.icon.replace("-outline", "") as any) : tab.icon}
                size={20}
                color={isActive ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.mutedForeground },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <KeyboardAvoidingView style={styles.tabContent} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {activeTab === "meeting" && (
          <View style={styles.meetingView}>
            
            {/* Live Video Stage Grid */}
            {videoTracks.length === 0 ? (
              <View style={[styles.placeholderStage, { backgroundColor: colors.secondary }]}>
                <Ionicons name="videocam-off-outline" size={48} color={colors.mutedForeground} />
                <Text style={[styles.placeholderText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  No active cameras
                </Text>
                <Text style={[styles.placeholderSubtext, { color: colors.mutedForeground }]}>
                  Turn on your camera or wait for other participants to join.
                </Text>
              </View>
            ) : (
              <FlatList
                data={videoTracks}
                keyExtractor={(item) => item.sid}
                numColumns={videoTracks.length > 1 ? 2 : 1}
                key={videoTracks.length > 1 ? "grid" : "list"}
                renderItem={({ item }) => (
                  <View style={styles.videoContainer}>
                    <VideoView
                      videoTrack={item.track}
                      style={styles.videoStream}
                    />
                    <View style={styles.participantNameTag}>
                      <Text style={styles.participantNameText}>
                        {item.participant.identity || "Participant"} {item.source === Track.Source.ScreenShare ? "(Screen)" : ""}
                      </Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={{ flexGrow: 1 }}
              />
            )}

            {/* Meeting Room Control Bar */}
            <View style={[
              styles.controlsBar,
              {
                backgroundColor: colors.card,
                borderColor: colors.border + "30",
                paddingHorizontal: barPadding,
                gap: barGap,
              }
            ]}>
              {/* Mic Toggle */}
              <TouchableOpacity
                onPress={toggleMic}
                style={[
                  styles.controlRoundBtn,
                  { width: buttonSize, height: buttonSize, borderRadius: buttonRadius },
                  isMicEnabled
                    ? { backgroundColor: colors.secondary }
                    : { backgroundColor: colors.destructive }
                ]}
              >
                <Ionicons
                  name={isMicEnabled ? "mic" : "mic-off"}
                  size={iconSize}
                  color={isMicEnabled ? colors.foreground : "#fff"}
                />
              </TouchableOpacity>

              {/* Camera Toggle */}
              <TouchableOpacity
                onPress={toggleCamera}
                style={[
                  styles.controlRoundBtn,
                  { width: buttonSize, height: buttonSize, borderRadius: buttonRadius },
                  isCameraEnabled
                    ? { backgroundColor: colors.secondary }
                    : { backgroundColor: colors.destructive }
                ]}
              >
                <Ionicons
                  name={isCameraEnabled ? "videocam" : "videocam-off"}
                  size={iconSize}
                  color={isCameraEnabled ? colors.foreground : "#fff"}
                />
              </TouchableOpacity>

              {/* Screen Share Toggle */}
              <TouchableOpacity
                onPress={toggleScreenShare}
                style={[
                  styles.controlRoundBtn,
                  { width: buttonSize, height: buttonSize, borderRadius: buttonRadius },
                  isScreenSharing
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.secondary }
                ]}
              >
                <Ionicons
                  name="desktop"
                  size={iconSize}
                  color={isScreenSharing ? "#fff" : colors.foreground}
                />
              </TouchableOpacity>

              {/* Record Toggle */}
              <TouchableOpacity
                onPress={handleRecordToggle}
                style={[
                  isCompact ? styles.controlRoundBtn : styles.recordBtn,
                  isCompact && { width: buttonSize, height: buttonSize, borderRadius: buttonRadius },
                  { backgroundColor: colors.secondary },
                  recordingState === "recording" && { borderColor: colors.destructive, borderWidth: 1 }
                ]}
              >
                {recordingState === "recording" ? (
                  <>
                    <View style={[styles.recordingDot, { backgroundColor: colors.destructive }]} />
                    {!isCompact && (
                      <Text style={[styles.recordText, { color: colors.destructive }]}>
                        {formatElapsed(recordingElapsed)}
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <View style={[styles.recordDotIdle, { backgroundColor: colors.destructive }]} />
                    {!isCompact && (
                      <Text style={[styles.recordText, { color: colors.foreground }]}>
                        Record
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>

              {/* Separator */}
              <View style={[styles.verticalSeparator, { backgroundColor: colors.border + "60" }]} />

              {/* Leave Room */}
              <TouchableOpacity
                onPress={handleLeave}
                style={[
                  isCompact ? styles.controlRoundBtn : styles.leaveBtn,
                  isCompact && { width: buttonSize, height: buttonSize, borderRadius: buttonRadius },
                  { backgroundColor: colors.secondary }
                ]}
              >
                {isCompact ? (
                  <Ionicons name="log-out" size={iconSize} color={colors.foreground} />
                ) : (
                  <Text style={[styles.leaveText, { color: colors.foreground }]}>Leave</Text>
                )}
              </TouchableOpacity>

              {/* End Meeting Button (Host only) */}
              {isHost && (
                <TouchableOpacity
                  onPress={handleEndMeeting}
                  style={[
                    isCompact ? styles.controlRoundBtn : styles.endMeetingBtn,
                    isCompact && { width: buttonSize, height: buttonSize, borderRadius: buttonRadius },
                    { backgroundColor: colors.destructive }
                  ]}
                >
                  <Ionicons name="call" size={iconSize} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
                  {!isCompact && (
                    <Text style={styles.endMeetingText}>End</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {activeTab === "tasks" && (
          <View style={styles.flex}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
                placeholder="Add a new task..."
                placeholderTextColor={colors.mutedForeground}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
              />
              <AppButton title="Add" size="sm" onPress={handleAddTask} loading={addingTask} disabled={!newTaskTitle.trim()} />
            </View>
            <FlatList
              data={tasks}
              renderItem={({ item }) => (
                <TaskCard
                  task={item}
                  onToggle={(t: Task) => updateTaskStatus(t.id, t.status === "done" ? "open" : "done")}
                  currentUserId={currentUser?.uid}
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No tasks yet. Add one above!</Text>
              }
            />
          </View>
        )}

        {activeTab === "chat" && (
          <View style={styles.flex}>
            <FlatList
              ref={chatListRef}
              data={messages}
              renderItem={({ item }) => (
                <ChatMessageBubble
                  text={item.text}
                  senderName={item.senderName}
                  isOwn={item.senderId === currentUser?.uid}
                  timestamp={item.createdAt?.toDate() || null}
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.chatListContent}
              onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No messages yet. Say hello!</Text>
              }
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
  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { ...typography.h3, flex: 1 },
  titleContainer: { flex: 1, marginHorizontal: spacing.md, alignItems: "center" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginTop: 2,
  },
  statusText: { fontSize: 10, fontWeight: "bold" },
  tabBar: { flexDirection: "row", height: 48, borderBottomWidth: 1 },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  tabContent: { flex: 1 },
  flex: { flex: 1 },
  meetingView: { flex: 1, padding: spacing.lg, paddingBottom: spacing.sm },
  placeholderStage: {
    flex: 1,
    borderRadius: borderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  placeholderText: { ...typography.h3, marginTop: spacing.md },
  placeholderSubtext: { ...typography.bodySmall, textAlign: "center", marginTop: 4 },
  inputRow: {
    flexDirection: "row",
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  listContent: { padding: spacing.lg, paddingBottom: 100 },
  chatListContent: { paddingVertical: spacing.lg },
  emptyText: { ...typography.bodySmall, textAlign: "center", marginTop: spacing["5xl"] },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginTop: spacing.md,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  controlRoundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  recordBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordDotIdle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordText: {
    fontSize: 13,
    fontWeight: "600",
  },
  verticalSeparator: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
  leaveBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveText: {
    fontSize: 13,
    fontWeight: "600",
  },
  endMeetingBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  endMeetingText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  videoContainer: {
    flex: 1,
    margin: 4,
    height: 180,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  videoStream: {
    width: "100%",
    height: "100%",
  },
  participantNameTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  participantNameText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
