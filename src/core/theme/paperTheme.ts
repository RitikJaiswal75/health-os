import { MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'System',
};

export const healthOsTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#BB86FC',
    secondary: '#03DAC6',
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2C2C2C',
    onSurface: '#E8E8E8',
    onSurfaceVariant: '#B0B0B0',
    outline: '#444444',
    error: '#CF6679',
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const tokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 999,
  },
  minTouchTarget: 44,
} as const;
