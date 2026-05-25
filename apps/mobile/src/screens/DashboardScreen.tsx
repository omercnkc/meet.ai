import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, useWindowDimensions } from "react-native";
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
  const { currentUser, loading: authLoading, signOut } = useAuth();
  const { meetings, loading: meetingsLoading } = useMeetings(currentUser?.uid);
  
  const [isCreating, setIsCreating] = useState(false);

  const endedMeetingIds = useMemo(() => meetings.filter((m) => m.status === "ended").map((m) => m.id), [meetings]);
  
  const { tasks: openTasks, loading: openTasksLoading } = useOpenTasksForMeetings(endedMeetingIds);
  const { tasks: doneTasks, loading: doneTasksLoading } = useDoneTasksForMeetings(endedMeetingIds);
  
  const handleCreateMeeting = async () => {
    if (!currentUser) return;
    const uid = currentUser.uid ?? (currentUser as any).userId;
    if (!uid) return;
    setIsCreating(true);
    try {
      const userName = currentUser.displayName || currentUser.email?.split("@")[0] || "User";
      const meeting = await createMeeting(uid, `${userName}'s Meeting`);
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
    setMode(isDark ? "light" : "dark");
  };

  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  if (authLoading || meetingsLoading) return <LoadingState message="Loading your dashboard..." />;

  if (!currentUser) return <EmptyState title="Not Authenticated" description="Please log in again." icon="lock-closed-outline" />;

  const userId = currentUser.uid ?? (currentUser as any).userId;

  if (!userId) return <EmptyState title="User ID missing" description="Could not resolve authenticated user ID." icon="warning-outline" />;

  const displayName = currentUser.displayName || currentUser.email?.split("@")[0] || "User";

  const meetingsContent = (
    <AppCard style={styles.meetingsCard} padded={false}>
      <View style={[styles.cardHeader, { borderBottomColor: colors.border + "44", borderBottomWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("recentMeetings")}</Text>
      </View>
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
        <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
          {meetings.slice(0, 10).map((m) => (
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
          ))}
        </ScrollView>
      )}
    </AppCard>
  );

  const openTasksContent = (
    <AppCard style={styles.tasksCard} padded={false}>
      <View style={[styles.cardHeader, { borderBottomColor: colors.border + "44", borderBottomWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <Ionicons name="checkbox-outline" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("openTasksTitle")}</Text>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md }}>
        {openTasks.length === 0 ? (
          <View style={styles.taskHintContainer}>
            <Text style={[styles.taskHint, { color: colors.mutedForeground }]}>
              {t("noOpenTasks")}
            </Text>
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
            {openTasks.slice(0, 10).map((task) => {
              const taskMeeting = meetings.find((m) => m.id === task.meetingId);
              return (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  meeting={taskMeeting} 
                  currentUserId={currentUser?.uid}
                />
              );
            })}
          </ScrollView>
        )}
      </View>
    </AppCard>
  );

  const completedTasksContent = (
    <AppCard style={styles.tasksCard} padded={false}>
      <View style={[styles.cardHeader, { borderBottomColor: colors.border + "44", borderBottomWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("completedTasksTitle")}</Text>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md }}>
        {doneTasks.length === 0 ? (
          <View style={styles.taskHintContainer}>
            <Text style={[styles.taskHint, { color: colors.mutedForeground }]}>
              {t("noCompletedTasks")}
            </Text>
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
            {doneTasks.slice(0, 10).map((task) => {
              const taskMeeting = meetings.find((m) => m.id === task.meetingId);
              return (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  meeting={taskMeeting} 
                  currentUserId={currentUser?.uid}
                />
              );
            })}
          </ScrollView>
        )}
      </View>
    </AppCard>
  );

  return (
    <ScreenContainer scrollable>
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <Text style={[styles.logoText, { color: colors.foreground }]}>
          meet<Text style={{ color: colors.primary }}>.ai</Text>
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleLanguage} style={[styles.actionBtn, { backgroundColor: colors.secondary }]}>
            <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>
              {lang.toUpperCase()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme} style={[styles.actionBtn, { backgroundColor: colors.secondary }]}>
            <Ionicons 
              name={isDark ? "sunny-outline" : "moon-outline"} 
              size={18} 
              color={colors.foreground} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={[styles.actionBtn, { backgroundColor: colors.secondary }]}>
            <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting Banner */}
      <View style={styles.welcomeContainer}>
        <Text style={[styles.welcome, { color: colors.foreground }]}>
          {t("welcomeTitle", { name: displayName })}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {t("welcomeSubtitle")}
        </Text>
      </View>

      {/* Main CTA */}
      <AppButton
        title={isCreating ? t("startingMeeting") : t("startMeeting")}
        onPress={handleCreateMeeting}
        loading={isCreating}
        size="md"
        icon={<Ionicons name="videocam" size={20} color={colors.primaryForeground} />}
        style={{ marginBottom: spacing.xl }}
      />

      {/* Responsive Dashboard Grid */}
      {isTablet ? (
        <View style={styles.tabletLayout}>
          <View style={styles.leftColumn}>
            {meetingsContent}
          </View>
          <View style={styles.rightColumn}>
            {openTasksContent}
            {completedTasksContent}
          </View>
        </View>
      ) : (
        <View style={styles.mobileLayout}>
          {meetingsContent}
          <View style={{ height: spacing.lg }} />
          {openTasksContent}
          <View style={{ height: spacing.lg }} />
          {completedTasksContent}
          <View style={{ height: spacing["4xl"] }} />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerActions: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: spacing.sm,
  },
  actionBtn: { 
    height: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
  },
  welcomeContainer: {
    marginBottom: spacing.lg,
  },
  welcome: { 
    ...typography.h1,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: { 
    ...typography.body,
    fontSize: 14,
  },
  tabletLayout: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  leftColumn: {
    flex: 2,
  },
  rightColumn: {
    flex: 1.2,
    gap: spacing.lg,
  },
  mobileLayout: {
    flexDirection: "column",
  },
  meetingsCard: { 
    overflow: "hidden",
  },
  tasksCard: { 
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyAction: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: spacing.xs,
  },
  taskHintContainer: { 
    paddingVertical: spacing.xl, 
    alignItems: "center", 
    justifyContent: "center",
  },
  taskHint: { 
    ...typography.bodySmall, 
    fontStyle: "italic", 
    textAlign: "center",
  },
});
