/**
 * LoadingState — Full-screen or inline loading indicator.
 */

import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useTheme, spacing, typography } from "../theme";

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  size?: "small" | "large";
}

export function LoadingState({
  message = "Loading...",
  fullScreen = true,
  size = "large",
}: LoadingStateProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        { backgroundColor: fullScreen ? colors.background : "transparent" },
      ]}
    >
      <ActivityIndicator size={size} color={colors.primary} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["3xl"],
  },
  fullScreen: {
    flex: 1,
  },
  text: {
    ...typography.bodySmall,
    marginTop: spacing.md,
  },
});
