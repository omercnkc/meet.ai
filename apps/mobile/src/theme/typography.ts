/**
 * Typography scale for the mobile app.
 * Replicates the web app's font hierarchy using system fonts.
 */

import { TextStyle } from "react-native";

export const typography: Record<string, TextStyle> = {
  h1: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    fontWeight: "400",
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  caption: {
    fontSize: 12,
    fontWeight: "400",
  },
  button: {
    fontSize: 15,
    fontWeight: "600",
  },
};
