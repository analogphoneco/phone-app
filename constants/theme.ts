/**
 * 90s Retro Telephone Theme
 * Inspired by cordless phones, caller ID boxes, and warm film tones
 */

import { Platform } from 'react-native';

// Film-inspired warm palette (original)
const palette = {
  warmBeige: '#E8E1D6',      // primary background
  paperWhite: '#F7F5F2',     // cards, surfaces
  inkBlack: '#1A1A1A',       // logo, primary text
  kodakRed: '#C73A32',       // accent (sparing)
  filmYellow: '#EFC14A',     // accent alt (sparing)
  mutedGray: '#8A8379',      // secondary text, icons
  darkSurface: '#2A2826',    // dark mode cards
  darkBackground: '#1F1D1B', // dark mode background
  // Semantic colors
  success: '#027a2a',
  successLight: '#e6ffed',
  error: '#dc3545',
  errorLight: '#ffebe6',
};

export const Colors = {
  light: {
    text: palette.inkBlack,
    background: palette.warmBeige,
    surface: palette.paperWhite,
    cardBackground: palette.paperWhite,
    tint: palette.kodakRed,
    accent: palette.filmYellow,
    icon: palette.mutedGray,
    tabIconDefault: palette.mutedGray,
    tabIconSelected: palette.kodakRed,
    success: palette.success,
    successLight: palette.successLight,
    error: palette.error,
    errorLight: palette.errorLight,
    warning: '#f39c12',
  },
  dark: {
    text: palette.paperWhite,
    background: palette.darkBackground,
    surface: palette.darkSurface,
    cardBackground: palette.darkSurface,
    tint: palette.filmYellow,
    accent: palette.kodakRed,
    icon: '#9A9590',
    tabIconDefault: '#9A9590',
    tabIconSelected: palette.filmYellow,
    success: '#2ecc71',
    successLight: '#1a3d2a',
    error: '#e74c3c',
    errorLight: '#3d1a1a',
    warning: '#f1c40f',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'Inter_400Regular',
    sansBold: 'Inter_700Bold',
    sansMedium: 'Inter_500Medium',
    sansSemiBold: 'Inter_600SemiBold',
    sansLight: 'Inter_300Light',
    serif: 'Georgia',
    mono: 'Courier',
  },
  default: {
    sans: 'Inter_400Regular',
    sansBold: 'Inter_700Bold',
    sansMedium: 'Inter_500Medium',
    sansSemiBold: 'Inter_600SemiBold',
    sansLight: 'Inter_300Light',
    serif: 'serif',
    mono: 'monospace',
  },
  web: {
    sans: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    sansBold: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    sansMedium: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    sansSemiBold: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    sansLight: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});

/**
 * Elevation/Shadow system for depth and hierarchy
 */
export const Elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
};

/**
 * Animation timing constants
 */
export const Animation = {
  fast: 150,
  normal: 250,
  slow: 350,
  springConfig: {
    damping: 20,
    stiffness: 300,
  },
};
