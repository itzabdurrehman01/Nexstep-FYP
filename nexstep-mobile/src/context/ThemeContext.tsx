import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getColors } from '../utils/theme';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  dark: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  colors: ReturnType<typeof getColors>;
}

const STORAGE_KEY = 'nexstep_theme_preference';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('light');

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (stored === 'system' || stored === 'light' || stored === 'dark') {
        setPreferenceState(stored);
      } else {
        setPreferenceState('light');
      }
    }).catch(() => {});
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  };

  const dark = preference === 'dark';
  const value = useMemo(() => ({ dark, preference, setPreference, colors: getColors(dark) }), [dark, preference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
