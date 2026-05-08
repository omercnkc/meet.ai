/**
 * ErrorState — Shown when a request fails.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, spacing, typography } from "../theme";
import { AppButton } from "./AppButton";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={40} color={colors.destructive} />
      <Text style={[styles.text, { color: colors.foreground }]}>{message}</Text>
      {onRetry && (
        <AppButton
          title="Try Again"
          variant="outline"
          size="sm"
          onPress={onRetry}
          style={{ marginTop: spacing.md }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["5xl"],
    paddingHorizontal: spacing["2xl"],
  },
  text: {
    ...typography.body,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
