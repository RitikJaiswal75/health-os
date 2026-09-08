import { DarkTheme, type Theme } from 'expo-router';

import { healthOsTheme } from './paperTheme';

/** React Navigation theme aligned with Paper dark tokens. */
export const healthOsNavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: healthOsTheme.colors.primary,
    background: healthOsTheme.colors.background,
    card: healthOsTheme.colors.surface,
    text: healthOsTheme.colors.onSurface,
    border: healthOsTheme.colors.outline,
    notification: healthOsTheme.colors.error,
  },
};

export const screenBackgroundStyle = {
  backgroundColor: healthOsTheme.colors.background,
} as const;
