import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.tichuCounter",
  appName: "Dragon's Count",
  webDir: "dist",
  server: {
    // Allow mixed content for Firebase Auth (needed on some Android versions)
    androidScheme: "https",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0d1117",
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1000,
      backgroundColor: "#0d1117",
      showSpinner: false,
    },
    GoogleSignIn: {
      clientId:
        "1017263787450-rqf7n7h7g740tiqqj3936psd7pd16p25.apps.googleusercontent.com",
    },
  },
};

export default config;
