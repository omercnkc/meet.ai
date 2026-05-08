/**
 * MeetingSummaryScreen — Detailed view of an ended meeting.
 * Shows recordings, transcripts, AI Q&A, and tasks.
 */

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing, typography, borderRadius } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { useTasks } from "../hooks/useTasks";
import { ScreenContainer } from "../components/ScreenContainer";
import { LoadingState } from "../components/LoadingState";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { TranscriptViewer } from "../components/TranscriptViewer";
import { AIQuestionBox } from "../components/AIQuestionBox";
import { TaskCard } from "../components/TaskCard";
import { getMeeting } from "../services/meetings";
import { getRecordingsByMeeting, Recording } from "../services/recordings";
import { getTranscriptsByMeeting, generateTranscript, Transcript } from "../services/transcripts";
import { updateTaskStatus, createTask, Task } from "../services/tasks";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "MeetingSummary">;

export default function MeetingSummaryScreen({ route, navigation }: Props) {
  const { meetingId } = route.params;
  const { colors } = useTheme();
  const { currentUser } = useAuth();

  const [meeting, setMeeting] = useState<any>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  const { tasks, loading: tasksLoading } = useTasks(meetingId);  const [errorState, setErrorState] = useState<string | null>(null);
  const [isRecordingPending, setIsRecordingPending] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;

  useEffect(() => {
    loadData();
  }, [meetingId]);

  // Auto-retry if recording is pending
  useEffect(() => {
    if (isRecordingPending && retryCount < MAX_RETRIES) {
      const timer = setTimeout(() => {
        console.log(`[MeetingSummaryScreen] Auto-retrying loadData (Attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        setRetryCount(prev => prev + 1);
        loadData();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isRecordingPending, retryCount]);

  const loadData = async () => {
    setErrorState(null);
    setLoadingMeeting(true);
    try {
      console.log(`\n--- [MeetingSummaryScreen] loadData START ---`);
      console.log(`Meeting ID: ${meetingId}`);
      
      const token = currentUser ? await currentUser.getIdToken() : null;
      console.log(`Auth Token Present: ${!!token}`);

      const { ENV } = require("../config/env");
      console.log(`API Base URL: ${ENV.API_BASE_URL}`);

      // 1. Load Meeting from Firestore (Already implemented in getMeeting)
      const m = await getMeeting(meetingId);
      setMeeting(m);
      console.log(`Meeting Status: ${m?.status}`);

      // 2. Load Recordings & Transcripts with individual try-catch to detect "Not Ready" vs "Network Failure"
      let r: Recording[] = [];
      let t: Transcript[] = [];
      let recordingError = false;

      try {
        console.log(`[API Call] GET /api/recordings/${meetingId}`);
        r = await getRecordingsByMeeting(meetingId);
        setIsRecordingPending(false);
      } catch (err: any) {
        if (err.status === 404) {
          console.log(`[MeetingSummaryScreen] Recording not found (404). Setting pending state.`);
          setIsRecordingPending(true);
        } else {
          console.error(`[MeetingSummaryScreen] Recording API Error (${err.status}):`, err.message);
          recordingError = true;
          throw err; // Re-throw to be caught by outer catch if it's a real network/server error
        }
      }

      try {
        console.log(`[API Call] GET /api/transcripts/${meetingId}`);
        t = await getTranscriptsByMeeting(meetingId);
      } catch (err: any) {
        if (err.status === 404) {
          console.log(`[MeetingSummaryScreen] Transcript not found (404).`);
        } else {
          console.error(`[MeetingSummaryScreen] Transcript API Error (${err.status}):`, err.message);
          // Don't fail the whole page for transcripts
        }
      }

      setRecordings(r);
      setTranscripts(t);
      console.log(`--- [MeetingSummaryScreen] loadData SUCCESS ---\n`);
    } catch (err: any) {
      console.log(`[MeetingSummaryScreen] loadData FAILED:`, err.message || err);
      if (err.name === "ApiError") {
        setErrorState(`API Error (${err.status}): ${err.message}`);
      } else {
        setErrorState(`Network Request Failed. Please check your connection.\nDetails: ${err.message}`);
      }
    } finally {
      setLoadingMeeting(false);
    }
  };

  const handleGenerateTranscript = async (meetingId: string) => {
    setGenerating(true);
    try {
      await generateTranscript(meetingId);
      Alert.alert("Success", "Transcript generation started. It will appear here shortly.");
      setTimeout(loadData, 5000);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to start transcript generation");
    } finally {
      setGenerating(false);
    }
  };

  const handleAddTask = async () => {
    // We could add an inline task creation here like in web
    // For now, let's just keep it simple
  };

  if (loadingMeeting) return <LoadingState message="Loading meeting summary..." />;

  if (errorState) {
    return (
      <ScreenContainer scrollable>
        <View style={styles.section}>
          <AppCard style={{ backgroundColor: colors.destructive + "20", borderColor: colors.destructive }}>
            <Ionicons name="warning" size={32} color={colors.destructive} style={{ marginBottom: spacing.sm }} />
            <Text style={[styles.sectionTitle, { color: colors.destructive }]}>Connection Error</Text>
            <Text style={[styles.infoValue, { color: colors.foreground, marginTop: spacing.sm }]}>
              {errorState}
            </Text>
            <AppButton 
              title="Retry Connection" 
              onPress={loadData} 
              variant="outline"
              style={{ marginTop: spacing.md }}
            />
          </AppCard>
        </View>
      </ScreenContainer>
    );
  }

  const transcriptContent = transcripts[0]?.content;
  const hasRecording = recordings.length > 0;

  return (
    <ScreenContainer scrollable>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Meeting Info</Text>
        </View>
        <AppCard>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Title</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{meeting?.title}</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Status</Text>
              <Text style={[styles.infoValue, { color: meeting?.status === "ended" ? colors.mutedForeground : colors.success }]}>
                {meeting?.status}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Date</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {meeting?.createdAt?.toDate().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </AppCard>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mic-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recordings</Text>
        </View>
        
        {isRecordingPending ? (
          <AppCard style={{ backgroundColor: colors.primary + "10", borderStyle: "dashed" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <LoadingState size="small" fullScreen={false} message="" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.recTitle, { color: colors.primary }]}>Recording is still being processed</Text>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  We're preparing your meeting audio. This usually takes a few seconds.
                </Text>
              </View>
            </View>
            <AppButton 
              title="Refresh Now" 
              onPress={() => { setRetryCount(0); loadData(); }} 
              variant="outline" 
              size="sm" 
              style={{ marginTop: spacing.md }}
            />
          </AppCard>
        ) : !hasRecording ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No recordings found for this meeting.</Text>
        ) : (
          recordings.map((rec) => (
            <AppCard key={rec.id} style={styles.recordingCard}>
              <View style={styles.recInfo}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.recTitle, { color: colors.foreground }]}>Recording ready</Text>
              </View>
              {transcripts.length === 0 && (
                <AppButton
                  title="Generate Transcript"
                  onPress={() => handleGenerateTranscript(meetingId)}
                  loading={generating}
                  variant="outline"
                  size="sm"
                  icon={<Ionicons name="sparkles" size={16} color={colors.foreground} />}
                />
              )}
            </AppCard>
          ))
        )}
      </View>

      {transcriptContent && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Transcript</Text>
          </View>
          <TranscriptViewer content={transcriptContent} />
        </View>
      )}

      {transcriptContent && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>AI Q&A</Text>
          </View>
          <AIQuestionBox meetingId={meetingId} />
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkbox-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Action Items</Text>
        </View>
        {tasks.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No tasks found.</Text>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={(t: Task) => updateTaskStatus(t.id, t.status === "done" ? "open" : "done")}
              currentUserId={currentUser?.uid}
            />
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing["3xl"],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
  },
  infoLabel: {
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.body,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    gap: spacing["2xl"],
  },
  infoCol: {
    flex: 1,
  },
  emptyText: {
    ...typography.bodySmall,
    fontStyle: "italic",
    paddingVertical: spacing.md,
  },
  recordingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  recInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recTitle: {
    ...typography.bodySmall,
    fontWeight: "500",
  },
  metaText: {
    ...typography.caption,
    marginTop: 2,
  },
});
