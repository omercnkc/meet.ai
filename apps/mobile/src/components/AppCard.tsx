/**
 * AppCard — Card container component.
 * Matches the web app's card style: rounded-xl, border-border/60,
 * bg-card, shadow-sm.
 */

import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useTheme, borderRadius, spacing } from "../theme";

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function AppCard({ children, style, padded = true }: AppCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border + "99", // ~60% opacity like border-border/60
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    // Subtle shadow matching shadow-sm
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  padded: {
    padding: spacing.lg,
  },
});
