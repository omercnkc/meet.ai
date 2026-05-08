import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme, spacing, typography, borderRadius } from "../theme";
import { useTranslation } from "../utils/i18n";
import { Meeting } from "../services/meetings";

interface MeetingCardProps {
  meeting: Meeting;
  onPress: (meeting: Meeting) => void;
  displayName?: string;
}

export function MeetingCard({ meeting, onPress, displayName }: MeetingCardProps) {
  const { colors } = useTheme();
  const { t, lang } = useTranslation();

  const isActive = meeting.status === "active";

  // Replace "User's Meeting" with actual display name (same as web)
  const title =
    meeting.title === "User's Meeting" && displayName
      ? t("welcomeTitle", { name: displayName }).replace("Hello, ", "").replace("Merhaba, ", "") + "'s Meeting" 
      : meeting.title;
  
  // Note: For complex titles we might need more i18n logic, but this matches web's simple suffix logic
  // Let's refine the title logic to be more i18n friendly if it's the default title
  const finalTitle = meeting.title === "User's Meeting" 
    ? (lang === "en" ? `${displayName}'s Meeting` : `${displayName}'in Toplantısı`)
    : meeting.title;

  const dateText = meeting.createdAt
    ? `${meeting.createdAt.toDate().toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")} at ${meeting.createdAt
        .toDate()
        .toLocaleTimeString(lang === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" })}`
    : t("justNow");

  return (
    <TouchableOpacity
      onPress={() => onPress(meeting)}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          borderBottomColor: colors.border + "66",
        },
      ]}
    >
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: isActive ? colors.foreground : colors.mutedForeground,
            },
          ]}
          numberOfLines={1}
        >
          {finalTitle}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {dateText}
        </Text>
      </View>
      <View
        style={[
          styles.badge,
          isActive
            ? {
                backgroundColor: "#22c55e1A",
                borderColor: "#22c55e33",
              }
            : {
                backgroundColor: colors.secondary,
                borderColor: colors.border + "80",
              },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            {
              color: isActive ? "#22c55e" : colors.secondaryForeground,
            },
          ]}
        >
          {isActive ? t("active") : t("ended")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    ...typography.body,
    fontWeight: "500",
  },
  date: {
    ...typography.caption,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
