import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing, typography, borderRadius } from "../theme";
import { useTranslation } from "../utils/i18n";
import { Task, updateTaskStatus } from "../services/tasks";
import { Meeting } from "../services/meetings";

interface TaskCardProps {
  task: Task;
  meeting?: Meeting;
  onToggle?: (task: Task) => void;
  currentUserId?: string;
}

export function TaskCard({ task, meeting, onToggle, currentUserId }: TaskCardProps) {
  const { colors, isDark } = useTheme();
  const { t, lang } = useTranslation();
  const isDone = task.status === "done";

  const handleToggle = async () => {
    if (onToggle) {
      onToggle(task);
      return;
    }
    
    // Default fallback if no onToggle provided
    if (isDone) return;
    try {
      await updateTaskStatus(task.id, "done");
    } catch (error) {
      console.error("Failed to update task status", error);
    }
  };

  const meetingTitle = meeting?.title || "";
  const dateStr = meeting?.createdAt 
    ? meeting.createdAt.toDate().toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")
    : "";
  const timeStr = meeting?.createdAt 
    ? meeting.createdAt.toDate().toLocaleTimeString(lang === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border + "44",
        },
        isDone && styles.doneContainer,
      ]}
    >
      <TouchableOpacity
        onPress={handleToggle}
        style={styles.checkButton}
        disabled={isDone}
      >
        <Ionicons
          name={isDone ? "checkmark-circle" : "ellipse-outline"}
          size={20}
          color={isDone ? "#22c55e" : colors.primary}
        />
      </TouchableOpacity>
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: colors.foreground },
            isDone && styles.doneTitle,
          ]}
        >
          {task.title}
        </Text>

        {/* Dashboard/Summary Format Details */}
        {meeting && (
          <View style={styles.details}>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {t("meetingPrefix", { defaultValue: "Meeting:" })} <Text style={{ color: colors.foreground + "CC", fontWeight: "500" }}>{meetingTitle}</Text>
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {t("datePrefix", { defaultValue: "Date:" })} <Text style={{ color: colors.foreground + "CC", fontWeight: "500" }}>{dateStr}</Text>
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {t("startPrefix", { defaultValue: "Start:" })} <Text style={{ color: colors.foreground + "CC", fontWeight: "500" }}>{timeStr}</Text>
            </Text>
          </View>
        )}

        {(task.assignedToUserId || task.assignedToName || meeting) && (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {t("assignedToPrefix", { defaultValue: "Assigned to:" })}{" "}
            <Text style={{ color: colors.foreground + "CC", fontWeight: "500" }}>
              {!task.assignedToUserId
                ? t("unassigned", { defaultValue: "Unassigned" })
                : task.assignedToUserId === currentUserId
                  ? t("you", { defaultValue: "You" })
                  : (task.assignedToName || task.assignedToUserId)}
            </Text>
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  doneContainer: {
    opacity: 0.8,
  },
  checkButton: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: "600",
    marginBottom: 4,
  },
  doneTitle: {
    textDecorationLine: "line-through",
  },
  details: {
    marginVertical: 4,
  },
  meta: {
    ...typography.caption,
    marginTop: 1,
    lineHeight: 16,
  },
});
