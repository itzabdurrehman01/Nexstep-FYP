import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * NexStep supports exactly two themes: light and dark.
 * Older saved values (e.g. "aurora", "sunrise") are migrated automatically.
 */
export const THEME_OPTIONS = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const LEGACY_THEME_MAP = { aurora: 'dark', midnight: 'dark', sunrise: 'light', pearl: 'light' };

function normalizeTheme(value) {
  if (value === 'light' || value === 'dark') return value;
  return LEGACY_THEME_MAP[value] || null;
}

function getInitialTheme() {
  try {
    const saved = normalizeTheme(localStorage.getItem('nexstep_theme'));
    if (saved) return saved;
  } catch (error) {
    console.warn('Unable to read the saved theme preference:', error);
  }
  try {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch { /* ignore */ }
  return 'light';
}

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
  themes: THEME_OPTIONS,
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const isDark = theme === 'dark';

  const setTheme = (next) => {
    const normalized = normalizeTheme(next);
    if (normalized) setThemeState(normalized);
  };

  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  useEffect(() => {
    try {
      localStorage.setItem('nexstep_theme', theme);
    } catch (e) {
      console.warn('LocalStorage error saving theme:', e);
    }
    const root = document.documentElement;
    root.dataset.nexstepTheme = theme;
    root.dataset.themeMode = theme;
    root.style.colorScheme = theme;
    root.classList.toggle('dark', isDark);
    document.body.style.backgroundColor = 'var(--ns-bg)';
    document.body.style.color = 'var(--ns-text)';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0d0f12' : '#ffffff');
  }, [theme, isDark]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark, themes: THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

export default ThemeContext;
