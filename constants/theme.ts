import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

// Pulse Theme Colors - Emerald/Teal palette for a calm focus experience
export const PULSE_COLORS = {
  light: {
    background: '#fafafa',
    foreground: '#18181b',
    card: '#ffffff',
    cardForeground: '#18181b',
    primary: '#14b8a6',      // Teal-500
    primaryForeground: '#ffffff',
    secondary: '#0d9488',    // Teal-600
    secondaryForeground: '#ffffff',
    muted: '#e4e4e7',        // Zinc-200
    mutedForeground: '#71717a',
    accent: '#2dd4bf',       // Teal-400
    accentForeground: '#18181b',
    border: '#e4e4e7',
    input: '#e4e4e7',
    destructive: '#ef4444',
    success: '#22c55e',
  },
  dark: {
    background: '#09090b',   // Zinc-950
    foreground: '#fafafa',   // Zinc-50
    card: '#18181b',         // Zinc-900
    cardForeground: '#fafafa',
    primary: '#2dd4bf',      // Teal-400
    primaryForeground: '#18181b',
    secondary: '#14b8a6',    // Teal-500
    secondaryForeground: '#ffffff',
    muted: '#27272a',        // Zinc-800
    mutedForeground: '#a1a1aa',
    accent: '#5eead4',       // Teal-300
    accentForeground: '#18181b',
    border: '#27272a',
    input: '#27272a',
    destructive: '#dc2626',
    success: '#22c55e',
  },
};

// Heatmap color scale - Teal gradient
export const HEATMAP_COLORS_DARK = {
  none: '#27272a',       // Zinc-800 - 0 hours
  low: '#134e4a',        // Teal-900 - <1 hour
  medium: '#0d9488',     // Teal-600 - 1-2 hours
  high: '#2dd4bf',       // Teal-400 - 2-4 hours
  max: '#5eead4',        // Teal-300 - 4+ hours
};

export const HEATMAP_COLORS_LIGHT = {
  none: '#e4e4e7',       // Zinc-200 - 0 hours
  low: '#ccfbf1',        // Teal-100 - <1 hour
  medium: '#5eead4',     // Teal-300 - 1-2 hours
  high: '#2dd4bf',       // Teal-400 - 2-4 hours
  max: '#0d9488',        // Teal-600 - 4+ hours
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: PULSE_COLORS.light.background,
      border: PULSE_COLORS.light.border,
      card: PULSE_COLORS.light.card,
      notification: PULSE_COLORS.light.destructive,
      primary: PULSE_COLORS.light.primary,
      text: PULSE_COLORS.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: PULSE_COLORS.dark.background,
      border: PULSE_COLORS.dark.border,
      card: PULSE_COLORS.dark.card,
      notification: PULSE_COLORS.dark.destructive,
      primary: PULSE_COLORS.dark.primary,
      text: PULSE_COLORS.dark.foreground,
    },
  },
};
