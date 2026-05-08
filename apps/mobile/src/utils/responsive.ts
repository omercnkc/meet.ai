import { useWindowDimensions, Platform } from "react-native";

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  // Screen size breakpoints
  const isSmallScreen = width < 360; // e.g., iPhone SE, old Androids
  const isMediumScreen = width >= 360 && width < 768; // standard phones
  const isTablet = width >= 768; // iPads, large tablets

  return {
    width,
    height,
    isSmallScreen,
    isMediumScreen,
    isTablet,
    // Spacing multiplier
    spacingScale: isSmallScreen ? 0.8 : isTablet ? 1.5 : 1,
    // Font scale
    fontScale: isSmallScreen ? 0.9 : isTablet ? 1.2 : 1,
    // Button stacking threshold
    shouldStackButtons: isSmallScreen,
    // Safe max width for central content (cards, forms)
    contentMaxWidth: 600,
  };
}

export const getResponsiveStyles = (width: number) => {
  const isSmallScreen = width < 360;
  return {
    buttonContainer: {
      flexDirection: isSmallScreen ? ("column" as const) : ("row" as const),
      gap: isSmallScreen ? 10 : 16,
    },
    button: {
      width: isSmallScreen ? "100%" : "auto",
      flex: isSmallScreen ? 0 : 1,
    },
  };
};
