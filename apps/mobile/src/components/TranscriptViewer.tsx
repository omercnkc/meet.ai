/**
 * TranscriptViewer — Renders meeting transcript content.
 */

import React from "react";
import { ScrollView, Text, StyleSheet } from "react-native";
import { useTheme, spacing, typography, borderRadius } from "../theme";

interface TranscriptViewerProps {
  content: string;
}

export function TranscriptViewer({ content }: TranscriptViewerProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.secondary, borderRadius: borderRadius.lg },
      ]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <Text style={[styles.text, { color: colors.foreground }]}>{content}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 300,
    marginTop: spacing.sm,
  },
  content: {
    padding: spacing.md,
  },
  text: {
    ...typography.bodySmall,
    lineHeight: 22,
  },
});
