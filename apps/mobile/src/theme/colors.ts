/**
 * Theme colors for the MeetAI mobile app.
 * Translated from the web app's oklch variables to Hex.
 */

export const colors = {
  // Light Mode (translated from root variables)
  light: {
    background: "#ffffff",
    foreground: "#252525",
    card: "#ffffff",
    cardForeground: "#252525",
    popover: "#ffffff",
    popoverForeground: "#252525",
    primary: "#343434",
    primaryForeground: "#fafafa",
    secondary: "#f5f5f5",
    secondaryForeground: "#343434",
    muted: "#f5f5f5",
    mutedForeground: "#8e8e8e",
    accent: "#f5f5f5",
    accentForeground: "#343434",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#ebebeb",
    input: "#ebebeb",
    ring: "#b5b5b5",
    success: "#22c55e",
    chart1: "#e11d48",
    chart2: "#2563eb",
    chart3: "#10b981",
    chart4: "#f59e0b",
    chart5: "#8b5cf6",
  },
  // Dark Mode (translated from .dark variables)
  dark: {
    background: "#252525",
    foreground: "#fafafa",
    card: "#252525",
    cardForeground: "#fafafa",
    popover: "#252525",
    popoverForeground: "#fafafa",
    primary: "#fafafa",
    primaryForeground: "#343434",
    secondary: "#454545",
    secondaryForeground: "#fafafa",
    muted: "#454545",
    mutedForeground: "#b5b5b5",
    accent: "#454545",
    accentForeground: "#fafafa",
    destructive: "#7f1d1d",
    destructiveForeground: "#fca5a5",
    border: "#454545",
    input: "#454545",
    ring: "#707070",
    success: "#22c55e",
    chart1: "#3b82f6",
    chart2: "#10b981",
    chart3: "#f59e0b",
    chart4: "#a855f7",
    chart5: "#ef4444",
  },
};

export type ThemeColors = typeof colors.dark;
