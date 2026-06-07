import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import './i18n';
import App from './App';

// Initialize native plugins when running on a device
if (Capacitor.isNativePlatform()) {
  document.body.classList.add('capacitor');

  import('@capacitor/splash-screen').then(({ SplashScreen }) => {
    SplashScreen.hide();
  });
}

// Dynamically select between HashRouter (iOS/Android) and BrowserRouter (Web)
// to prevent scheme-based history state security errors in WKWebView.
const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  </StrictMode>,
);
