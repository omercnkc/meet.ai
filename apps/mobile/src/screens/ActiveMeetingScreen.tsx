/**
 * ActiveMeetingScreen — Live meeting view with Tasks and Chat tabs.
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing, typography, borderRadius } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { useTasks } from "../hooks/useTasks";
import { useMessages } from "../hooks/useMessages";
import { ScreenContainer } from "../components/ScreenContainer";
import { LoadingState } from "../components/LoadingState";
import { TaskCard } from "../components/TaskCard";
import { ChatMessageBubble } from "../components/ChatMessageBubble";
import { AppButton } from "../components/AppButton";
import { getMeeting, endMeeting } from "../services/meetings";
import { createTask, updateTaskStatus, Task } from "../services/tasks";
import { sendMessage } from "../services/messages";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "ActiveMeeting">;
type TabKey = "meeting" | "tasks" | "chat";

export default function ActiveMeetingScreen({ route, navigation }: Props) {
  const { meetingId } = route.params;
  const { colors, isDark } = useTheme();
  const { currentUser } = useAuth();

  const [meeting, setMeeting] = useState<any>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("meeting");

  const { tasks, loading: tasksLoading } = useTasks(meetingId);
  const { messages, loading: chatLoading } = useMessages(meetingId);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [chatText, setChatText] = useState("");
  const chatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId = setTimeout(() => {
      if (isMounted && loadingMeeting) {
        console.warn("[ActiveMeetingScreen] getMeeting timeout. Forcing loading false.");
        setLoadingMeeting(false);
      }
    }, 10000);

    getMeeting(meetingId)
      .then((m) => {
        if (!isMounted) return;
        setMeeting(m);
        if (m?.status === "ended") {
          navigation.replace("MeetingSummary", { meetingId });
        }
      })
      .catch((err) => {
        console.warn("[ActiveMeetingScreen] Error getting meeting:", err);
      })
      .finally(() => {
        if (isMounted) {
          clearTimeout(timeoutId);
          setLoadingMeeting(false);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [meetingId]);

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
    try {
      await sendMessage(
        meetingId,
        chatText.trim(),
        currentUser.uid,
        currentUser.displayName || currentUser.email?.split("@")[0] || "User"
      );
      setChatText("");
    } catch (err) {
      console.error("Failed to send chat", err);
    }
  };

  if (loadingMeeting) return <LoadingState message="Joining meeting..." />;

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
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {meeting?.title || "Meeting"}
        </Text>
        <AppButton title="End" variant="destructive" size="sm" onPress={handleEndMeeting} />
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

      {/* Content */}
      <KeyboardAvoidingView style={styles.tabContent} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {activeTab === "meeting" && (
          <View style={styles.meetingView}>
            <View style={[styles.placeholderStage, { backgroundColor: colors.secondary }]}>
              <Ionicons name="videocam" size={48} color={colors.mutedForeground} />
              <Text style={[styles.placeholderText, { color: colors.mutedForeground }]} numberOfLines={1}>
                Video Stage
              </Text>
              <Text style={[styles.placeholderSubtext, { color: colors.mutedForeground }]}>
                LiveKit integration would render participants here.
              </Text>
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
  title: { ...typography.h3, flex: 1, marginHorizontal: spacing.md },
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
  meetingView: { flex: 1, padding: spacing.lg },
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
});
