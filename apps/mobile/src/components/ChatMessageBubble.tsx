/**
 * ChatMessageBubble — Chat message bubble component.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme, spacing, typography, borderRadius } from "../theme";

interface ChatMessageBubbleProps {
  text: string;
  senderName?: string;
  isOwn: boolean;
  timestamp?: Date | null;
}

export function ChatMessageBubble({ text, senderName, isOwn, timestamp }: ChatMessageBubbleProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      <View
        style={[
          styles.bubble,
          isOwn
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.secondary, borderBottomLeftRadius: 4 },
        ]}
      >
        {!isOwn && senderName && (
          <Text style={[styles.senderName, { color: colors.chart1 }]}>{senderName}</Text>
        )}
        <Text style={[styles.text, { color: isOwn ? colors.primaryForeground : colors.foreground }]}>
          {text}
        </Text>
        {timestamp && (
          <Text
            style={[styles.time, { color: isOwn ? colors.primaryForeground + "AA" : colors.mutedForeground }]}
          >
            {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.sm, paddingHorizontal: spacing.lg },
  ownContainer: { alignItems: "flex-end" },
  otherContainer: { alignItems: "flex-start" },
  bubble: { maxWidth: "80%", paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.xl },
  senderName: { ...typography.caption, fontWeight: "600", marginBottom: 2 },
  text: { ...typography.bodySmall },
  time: { ...typography.caption, fontSize: 10, marginTop: 4, textAlign: "right" },
});
