/**
 * Theme Context and Hook for the mobile app.
 * Provides colors, spacing, and typography to components.
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, ThemeColors } from "./colors";
import { spacing, borderRadius } from "./spacing";
import { typography } from "./typography";

export type ThemeMode = "dark" | "light" | "system";

interface ThemeContextType {
  colors: ThemeColors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, _setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem("theme_mode");
        if (savedMode) {
          _setMode(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error("Failed to load theme mode", error);
      }
    };
    loadTheme();
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    _setMode(newMode);
    try {
      await AsyncStorage.setItem("theme_mode", newMode);
    } catch (error) {
      console.error("Failed to save theme mode", error);
    }
  };

  const isDark = mode === "dark" || (mode === "system" && systemScheme === "dark");
  const activeColors = isDark ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider
      value={{
        colors: activeColors,
        spacing,
        borderRadius,
        typography,
        mode,
        setMode,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export { spacing, borderRadius, typography };
