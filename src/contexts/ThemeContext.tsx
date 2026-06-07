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

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [themeSetting]);

  // Persist preference to localStorage
  useEffect(() => {
    localStorage.setItem('theme', themeSetting);
  }, [themeSetting]);

  // Dynamically update status bar based on resolvedTheme
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: resolvedTheme === 'dark' ? Style.Dark : Style.Light });
        
        // setBackgroundColor is only supported on Android
        if (Capacitor.getPlatform() === 'android') {
          StatusBar.setBackgroundColor({ color: resolvedTheme === 'dark' ? '#121212' : '#F9FAFB' });
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
