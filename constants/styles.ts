/**
 * Centralized styling system for the app.
 * Vintage Analog Telephone aesthetic
 */

import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { Colors, Fonts } from "./theme";

type ColorScheme = typeof Colors.light;

/**
 * Typography presets - vintage telephone style
 */
export const createTypography = (colors: ColorScheme) => ({
  // Headings - slightly more condensed, vintage feel
  largeTitle: {
    fontSize: 32,
    fontFamily: Fonts?.sansBold,
    color: colors.text,
    letterSpacing: -0.5,
  } as TextStyle,
  
  title1: {
    fontSize: 26,
    fontFamily: Fonts?.sansBold,
    color: colors.text,
    letterSpacing: -0.3,
  } as TextStyle,
  
  title2: {
    fontSize: 22,
    fontFamily: Fonts?.sansBold,
    color: colors.text,
  } as TextStyle,
  
  title3: {
    fontSize: 20,
    fontFamily: Fonts?.sansMedium,
    color: colors.text,
  } as TextStyle,
  
  // Body text
  body: {
    fontSize: 17,
    fontFamily: Fonts?.sans,
    color: colors.text,
    lineHeight: 24,
  } as TextStyle,
  
  bodyMedium: {
    fontSize: 17,
    fontFamily: Fonts?.sansMedium,
    color: colors.text,
  } as TextStyle,
  
  callout: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: colors.text,
  } as TextStyle,
  
  subhead: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: colors.text,
  } as TextStyle,
  
  subheadMedium: {
    fontSize: 15,
    fontFamily: Fonts?.sansMedium,
    color: colors.text,
  } as TextStyle,
  
  footnote: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: colors.icon,
  } as TextStyle,
  
  caption: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: colors.icon,
  } as TextStyle,
  
  // Special - vintage label style
  sectionHeader: {
    fontSize: 12,
    fontFamily: Fonts?.sansSemiBold,
    color: colors.icon,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  } as TextStyle,
  
  mono: {
    fontSize: 14,
    fontFamily: Fonts?.mono,
    color: colors.text,
  } as TextStyle,
  
  // Vintage dial numbers
  dialNumber: {
    fontSize: 24,
    fontFamily: Fonts?.sansBold,
    color: colors.text,
    letterSpacing: 2,
  } as TextStyle,
  
  buttonText: {
    fontSize: 17,
    fontFamily: Fonts?.sansSemiBold,
    color: "#fff",
    letterSpacing: 0.5,
  } as TextStyle,
  
  buttonTextSmall: {
    fontSize: 15,
    fontFamily: Fonts?.sansMedium,
    color: "#fff",
  } as TextStyle,
});

/**
 * Layout Constants
 * Standard spacing values for consistent layouts across screens
 */
export const Layout = {
  /** Safe area padding for iOS notch/Dynamic Island - use for top content padding */
  safeAreaTop: 60,
  /** Standard horizontal/vertical padding for screen content */
  screenPadding: 20,
  /** Extra bottom padding for scrollable content */
  scrollPaddingBottom: 40,
};

/**
 * Shared component styles
 */
export const createSharedStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    // Containers
    // Use `screen` as the root container for all screens
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Use `screenContent` for non-scrolling screen content
    screenContent: {
      flex: 1,
      padding: Layout.screenPadding,
      paddingTop: Layout.safeAreaTop,
    },
    // Use `screenCentered` for loading states, empty states, centered content
    screenCentered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: Layout.screenPadding,
      paddingTop: Layout.safeAreaTop,
    },
    // Use `scrollContent` as contentContainerStyle for ScrollView/FlatList
    scrollContent: {
      padding: Layout.screenPadding,
      paddingTop: Layout.safeAreaTop,
      paddingBottom: Layout.scrollPaddingBottom,
    },
    
    // Cards - vintage embossed style with subtle shadow
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.icon + "15",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    cardLarge: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.icon + "15",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    // Vintage inset panel style
    cardInset: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.icon + "20",
    },
    
    // Buttons - vintage brass/bakelite style
    buttonPrimary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.tint,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 8,
      gap: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    buttonSecondary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.tint,
      gap: 6,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    // Vintage brass accent button
    buttonBrass: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 8,
      gap: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 3,
    },
    
    // Inputs - vintage switchboard style
    input: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 16,
      fontSize: 17,
      fontFamily: Fonts?.sans,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.icon + "30",
    },
    
    // Layout helpers
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    rowSpaced: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
    },
    
    // Sections
    section: {
      marginBottom: 24,
    },
    sectionTitleContainer: {
      marginBottom: 10,
      marginLeft: 4,
    },
    
    // Dividers
    divider: {
      height: 1,
      backgroundColor: colors.icon + "20",
      marginVertical: 12,
    },
    
    // Icons containers
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.tint + "20",
      alignItems: "center",
      justifyContent: "center",
    },
    iconCircleLarge: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.tint + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    iconCircleSmall: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.tint + "20",
      alignItems: "center",
      justifyContent: "center",
    },
    
    // Status indicators
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusDotSuccess: {
      backgroundColor: colors.success,
    },
    statusDotError: {
      backgroundColor: colors.error,
    },
    
    // Banners
    successBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      backgroundColor: colors.successLight,
      borderBottomWidth: 1,
      borderBottomColor: colors.success + "40",
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      backgroundColor: colors.errorLight,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.error + "40",
    },
  });

/**
 * Spacing constants
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/**
 * Border radius constants
 */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

/**
 * Hook to get all styles for a color scheme
 */
export function useAppStyles(colorScheme: string | null | undefined) {
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  return {
    colors,
    typography: createTypography(colors),
    styles: createSharedStyles(colors),
    spacing: Spacing,
    radius: Radius,
    layout: Layout,
  };
}
