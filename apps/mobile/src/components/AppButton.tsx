/**
 * AppButton — Premium styled button matching the web app's identity.
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from "react-native";
import { useTheme } from "../theme";
import { LinearGradient } from "expo-linear-gradient";

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function AppButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
  fullWidth = true,
}: AppButtonProps) {
  const { colors, borderRadius, spacing, typography, isDark } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          container: { backgroundColor: colors.primary },
          text: { color: colors.primaryForeground },
          gradient: isDark ? ["#3f3f46", "#18181b"] : ["#404040", "#262626"],
        };
      case "secondary":
        return {
          container: { backgroundColor: colors.secondary },
          text: { color: colors.secondaryForeground },
        };
      case "outline":
        return {
          container: {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: colors.border,
          },
          text: { color: colors.foreground },
        };
      case "destructive":
        return {
          container: { backgroundColor: colors.destructive },
          text: { color: colors.destructiveForeground },
        };
      case "ghost":
        return {
          container: { backgroundColor: "transparent" },
          text: { color: colors.foreground },
        };
      default:
        return {
          container: { backgroundColor: colors.primary },
          text: { color: colors.primaryForeground },
        };
    }
  };

  const v = getVariantStyles();
  const s = {
    sm: { height: 36, paddingHorizontal: spacing.md, text: typography.caption },
    md: { height: 48, paddingHorizontal: spacing.xl, text: typography.button },
    lg: { height: 56, paddingHorizontal: spacing["2xl"], text: typography.h3 },
  }[size];

  const buttonContent = (
    <View style={[styles.content, { height: s.height }]}>
      {loading ? (
        <ActivityIndicator size="small" color={v.text.color as string} />
      ) : (
        <>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[v.text, s.text, styles.text]}>{title}</Text>
        </>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.container,
        { borderRadius: borderRadius.lg },
        v.container,
        !fullWidth && { alignSelf: "flex-start" },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {variant === "primary" && !disabled && !loading && v.gradient ? (
        <LinearGradient
          colors={v.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.gradient, { borderRadius: borderRadius.lg }]}
        >
          {buttonContent}
        </LinearGradient>
      ) : (
        buttonContent
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    justifyContent: "center",
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
  },
  icon: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
