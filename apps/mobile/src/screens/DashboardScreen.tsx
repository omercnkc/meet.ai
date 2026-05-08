import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing, typography, borderRadius } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { useMeetings } from "../hooks/useMeetings";
import { useOpenTasksForMeetings, useDoneTasksForMeetings } from "../hooks/useTasks";
import { ScreenContainer } from "../components/ScreenContainer";
import { AppCard } from "../components/AppCard";
import { AppButton } from "../components/AppButton";
import { LoadingState } from "../components/LoadingState";
import { EmptyState } from "../components/EmptyState";
import { MeetingCard } from "../components/MeetingCard";
import { TaskCard } from "../components/TaskCard";
import { createMeeting } from "../services/meetings";
import { useTranslation } from "../utils/i18n";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export default function DashboardScreen({ navigation }: Props) {
  const { colors, mode, setMode, isDark } = useTheme();
  const { t, lang, setLanguage } = useTranslation();
  const { currentUser, signOut } = useAuth();
  const { meetings, loading: meetingsLoading } = useMeetings(currentUser?.uid);
  
  const [isCreating, setIsCreating] = useState(false);

  const endedMeetingIds = useMemo(() => meetings.filter((m) => m.status === "ended").map((m) => m.id), [meetings]);
  
  const { tasks: openTasks, loading: openTasksLoading } = useOpenTasksForMeetings(endedMeetingIds);
  const { tasks: doneTasks, loading: doneTasksLoading } = useDoneTasksForMeetings(endedMeetingIds);
  
  const handleCreateMeeting = async () => {
    if (!currentUser) return;
    setIsCreating(true);
    try {
      const userName = currentUser.displayName || currentUser.email?.split("@")[0] || "User";
      const meeting = await createMeeting(currentUser.uid, `${userName}'s Meeting`);
      navigation.navigate("ActiveMeeting", { meetingId: meeting.id });
    } catch (error) {
      console.error("Failed to create meeting", error);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(lang === "en" ? "tr" : "en");
  };

  const toggleTheme = () => {
    const nextMode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(nextMode);
  };

  if (meetingsLoading) return <LoadingState message="Loading your dashboard..." />;

  const displayName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "User";

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: spacing.md }}>
          <Text style={[styles.welcome, { color: colors.foreground }]} numberOfLines={1}>
            {t("welcomeTitle", { name: displayName })}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {t("welcomeSubtitle")}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleLanguage} style={styles.actionBtn}>
            <Text style={{ color: colors.primary, fontWeight: "bold", fontSize: 14 }}>
              {lang.toUpperCase()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme} style={styles.actionBtn}>
            <Ionicons 
              name={mode === "dark" ? "moon" : mode === "light" ? "sunny" : "settings-outline"} 
              size={20} 
              color={colors.mutedForeground} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={styles.actionBtn}>
            <Ionicons name="log-out-outline" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <AppButton
        title={isCreating ? t("startingMeeting") : t("startMeeting")}
        onPress={handleCreateMeeting}
        loading={isCreating}
        size="md"
        icon={<Ionicons name="videocam" size={20} color={colors.primaryForeground} />}
        style={{ marginBottom: spacing["2xl"] }}
      />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("recentMeetings")}</Text>
        </View>
        <AppCard style={styles.meetingsCard} padded={false}>
          {meetings.length === 0 ? (
            <EmptyState
              icon="videocam-outline"
              title={t("noMeetingsTitle")}
              description={t("noMeetingsDesc")}
              action={
                <TouchableOpacity onPress={handleCreateMeeting} style={styles.emptyAction}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: "600", marginLeft: 4 }}>{t("startFirstMeeting")}</Text>
                </TouchableOpacity>
              }
            />
          ) : (
            meetings.slice(0, 5).map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                displayName={displayName}
                onPress={(meeting) => {
                  if (meeting.status === "active") {
                    navigation.navigate("ActiveMeeting", { meetingId: meeting.id });
                  } else {
                    navigation.navigate("MeetingSummary", { meetingId: meeting.id });
                  }
                }}
              />
            ))
          )}
        </AppCard>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkbox-outline" size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("openTasksTitle")}</Text>
        </View>
        <AppCard style={styles.tasksCard} padded={false}>
          {openTasks.length === 0 ? (
            <View style={styles.taskHintContainer}>
              <Text style={[styles.taskHint, { color: colors.mutedForeground }]}>
                {t("noOpenTasks")}
              </Text>
            </View>
          ) : (
            openTasks.slice(0, 5).map((task) => {
              const taskMeeting = meetings.find((m) => m.id === task.meetingId);
              return (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  meeting={taskMeeting} 
                  currentUserId={currentUser?.uid}
                />
              );
            })
          )}
        </AppCard>
      </View>

      <View style={[styles.section, { marginBottom: spacing["4xl"] }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("completedTasksTitle")}</Text>
        </View>
        <AppCard style={styles.tasksCard} padded={false}>
          {doneTasks.length === 0 ? (
            <View style={styles.taskHintContainer}>
              <Text style={[styles.taskHint, { color: colors.mutedForeground }]}>
                {t("noCompletedTasks")}
              </Text>
            </View>
          ) : (
            doneTasks.slice(0, 5).map((task) => {
              const taskMeeting = meetings.find((m) => m.id === task.meetingId);
              return (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  meeting={taskMeeting} 
                  currentUserId={currentUser?.uid}
                />
              );
            })
          )}
        </AppCard>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing["2xl"],
  },
  welcome: { ...typography.h1 },
  subtitle: { ...typography.bodySmall },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  actionBtn: { 
    padding: spacing.sm,
    backgroundColor: "transparent",
    borderRadius: borderRadius.md,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginBottom: spacing["3xl"] },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { ...typography.h3 },
  meetingsCard: { overflow: "hidden" },
  tasksCard: { overflow: "hidden" },
  emptyAction: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.xs },
  taskHintContainer: { padding: spacing.xl, alignItems: "center", justifyContent: "center" },
  taskHint: { ...typography.bodySmall, fontStyle: "italic", textAlign: "center" },
});
