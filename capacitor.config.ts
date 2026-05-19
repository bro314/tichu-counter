import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.tichuCounter',
  appName: 'Tichu Counter',
  webDir: 'dist',
  server: {
    // Allow mixed content for Firebase Auth (needed on some Android versions)
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0d1117',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1000,
      backgroundColor: '#0d1117',
      showSpinner: false,
    },
  },
};

export default config;
