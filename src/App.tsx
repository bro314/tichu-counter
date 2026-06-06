import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import CircularProgress from '@mui/material/CircularProgress';
import HomeIcon from '@mui/icons-material/Home';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTranslation } from 'react-i18next';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { darkTheme } from './styles/theme';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/onboarding/AuthPage';
import ProfileSetupPage from './pages/onboarding/ProfileSetupPage';
import { appFrame, desktopOuter } from './styles/commonStyles';
import { OfflineSyncProvider, useOfflineSync } from './contexts/offlineSyncContext';

/** Main app shell shown after auth + onboarding */
function AppShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAnyUnsavedData } = useOfflineSync();
  const [backSnackbarOpen, setBackSnackbarOpen] = useState(false);

  // Handle native hardware and gesture back button (Android)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    const listenerPromise = CapApp.addListener('backButton', () => {
      if (!active) return;
      if (hasAnyUnsavedData()) {
        setBackSnackbarOpen(true);
      }
      if (location.pathname === '/') {
        CapApp.exitApp();
      } else {
        navigate(-1);
      }
    });

    return () => {
      active = false;
      listenerPromise.then((handle) => {
        handle.remove();
      });
    };
  }, [location.pathname, navigate, hasAnyUnsavedData]);

  // Toast on tab change or back/forward browser navigation
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      if (hasAnyUnsavedData()) {
        setBackSnackbarOpen(true);
      }
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname, hasAnyUnsavedData]);

  // Derive tab index from current pathname
  const getTabIndex = useCallback(() => {
    if (location.pathname.startsWith('/settings')) return 2;
    if (location.pathname.startsWith('/game')) return 1;
    return 0;
  }, [location.pathname]);

  const [tab, setTab] = useState(getTabIndex());

  // Keep tab in sync with URL after user navigates
  useEffect(() => {
    setTab(getTabIndex());
  }, [getTabIndex]);

  // Remember the last visited game ID so the "Game" tab can return to it
  const [lastGameId, setLastGameId] = useState<string | null>(() => {
    return localStorage.getItem('lastGameId');
  });

  // Track game ID from URL
  useEffect(() => {
    const match = location.pathname.match(/^\/game\/(.+)$/);
    if (match) {
      const gameId = match[1];
      setLastGameId(gameId);
      localStorage.setItem('lastGameId', gameId);
    }
  }, [location.pathname]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    if (newValue === 1 && lastGameId) {
      // Navigate to last visited game
      navigate(`/game/${lastGameId}`);
    } else {
      navigate(['/', '/game', '/settings'][newValue]);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        bgcolor: 'background.default',
      }}
    >
      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/game/:id" element={<GamePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      {/* Bottom navigation */}
      <BottomNavigation
        id="bottom-nav"
        value={tab}
        onChange={handleTabChange}
        showLabels
        sx={{
          flexShrink: 0,
          bgcolor: 'background.paper',
          height: 64,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <BottomNavigationAction
          id="nav-home"
          label={t('nav.home')}
          icon={<HomeIcon />}
        />
        <BottomNavigationAction
          id="nav-game"
          label={t('nav.game')}
          icon={<PlayArrowIcon />}
        />
        <BottomNavigationAction
          id="nav-settings"
          label={t('nav.settings')}
          icon={<SettingsIcon />}
        />
      </BottomNavigation>

      <Snackbar
        open={backSnackbarOpen}
        autoHideDuration={3000}
        onClose={() => setBackSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="info"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {t("game.syncPendingToast")}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/** Root component handling auth gates and onboarding */
function App() {
  const { user, loading, hasCompletedOnboarding } = useAuth();

  let content;

  if (loading) {
    content = (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
        }}
      >
        <CircularProgress />
      </Box>
    );
  } else if (!user) {
    // Not authenticated → show auth page
    if (!Capacitor.isNativePlatform() && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
    return (
      <OfflineSyncProvider>
        <MuiThemeProvider theme={darkTheme}>
          <Box sx={desktopOuter}>
            <Box sx={appFrame}>
              <AuthPage onAuthSuccess={() => { }} />
            </Box>
          </Box>
        </MuiThemeProvider>
      </OfflineSyncProvider>
    );
  } else if (!hasCompletedOnboarding) {
    // Authenticated but no profile yet → show profile setup
    if (!Capacitor.isNativePlatform() && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
    content = <ProfileSetupPage onComplete={() => { }} />;
  } else {
    // Fully authenticated and onboarded → show main app
    const path = window.location.pathname;
    if (!Capacitor.isNativePlatform() && !path.startsWith('/game') && path !== '/') {
      window.history.replaceState({}, '', '/');
    }
    content = <AppShell />;
  }

  return (
    <OfflineSyncProvider>
      <Box sx={desktopOuter}>
        <Box sx={appFrame}>
          {content}
        </Box>
      </Box>
    </OfflineSyncProvider>
  );
}

export default App;
