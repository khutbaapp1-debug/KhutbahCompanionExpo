export type ThemeMode = 'light' | 'dark' | 'high-contrast';

export const themes = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    card: '#FFFFFF',
    text: '#111827',
    textMuted: '#6B7280',
    textSecondary: '#374151',
    border: '#E5E7EB',
    primary: '#0F766E',
    primaryContainer: '#99F6E4',
  },
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    card: '#2A2A2A',
    text: '#F9FAFB',
    textMuted: '#9CA3AF',
    textSecondary: '#D1D5DB',
    border: '#374151',
    primary: '#4DB6AC',
    primaryContainer: '#134E4A',
  },
  'high-contrast': {
    background: '#000000',
    surface: '#111111',
    card: '#1A1A1A',
    text: '#FFFFFF',
    textMuted: '#CCCCCC',
    textSecondary: '#EEEEEE',
    border: '#555555',
    primary: '#00E5CC',
    primaryContainer: '#003333',
  },
} as const;

export type ThemeColors = (typeof themes)[ThemeMode];
