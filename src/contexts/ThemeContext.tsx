import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme } from '../styles/theme';

import { Capacitor } from '@capacitor/core';

import { useAuth } from './AuthContext';

export type ThemeSetting = 'light' | 'dark' | 'system';
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  themeSetting: ThemeSetting;
  setMode: (setting: ThemeSetting) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  themeSetting: 'system',
  setMode: () => { },
});

export const useThemeMode = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'dark' || saved === 'light' || saved === 'system') ? saved : 'system';
  });

  // Synchronize setting with profile preferences when loaded/changed remotely
  useEffect(() => {
    if (profile?.theme && (profile.theme === 'light' || profile.theme === 'dark' || profile.theme === 'system')) {
      setThemeSetting(profile.theme as ThemeSetting);
    }
  }, [profile?.theme]);

  const [resolvedTheme, setResolvedTheme] = useState<ThemeMode>(() => {
    if (themeSetting === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeSetting;
  });

  // Synchronize resolvedTheme with settings and media query changes
  useEffect(() => {
    if (themeSetting !== 'system') {
      setResolvedTheme(themeSetting);
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [themeSetting]);

  // Persist preference to localStorage
  useEffect(() => {
    localStorage.setItem('theme', themeSetting);
  }, [themeSetting]);

  // Dynamically update status bar based on resolvedTheme
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        if (resolvedTheme === 'dark') {
          StatusBar.setStyle({ style: Style.Dark });
          StatusBar.setBackgroundColor({ color: '#121212' }); // darkTheme background.default
        } else {
          StatusBar.setStyle({ style: Style.Light });
          StatusBar.setBackgroundColor({ color: '#F9FAFB' }); // lightTheme background.default
        }
      }).catch((err) => {
        console.error('Failed to update Capacitor StatusBar:', err);
      });
    }
  }, [resolvedTheme]);

  const theme = useMemo(() => (resolvedTheme === 'dark' ? darkTheme : lightTheme), [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ mode: resolvedTheme, themeSetting, setMode: setThemeSetting }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
