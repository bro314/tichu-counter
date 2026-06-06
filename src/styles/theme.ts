import { createTheme, type Theme } from '@mui/material/styles';
import { fonts, shape } from './tokens';

// Declare custom properties on MUI's Palette
declare module '@mui/material/styles' {
  interface Palette {
    badgeBg: {
      private: string;
      tag: string;
      tagText: string;
    };
    desktopBg: string;
    desktopBorder: string;
    desktopFrameShadow: string;
    dynamicHeaderShadow: string;
    dynamicBottomBarShadow: string;
    roundChipBg: string;
    roundChipText: string;
  }

  interface PaletteOptions {
    badgeBg?: {
      private?: string;
      tag?: string;
      tagText?: string;
    };
    desktopBg?: string;
    desktopBorder?: string;
    desktopFrameShadow?: string;
    dynamicHeaderShadow?: string;
    dynamicBottomBarShadow?: string;
    roundChipBg?: string;
    roundChipText?: string;
  }
}

/** Shared component overrides (same for both themes) */
const sharedComponents = {
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none' as const,
        borderRadius: shape.buttonRadius,
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: shape.buttonRadius,
        border: `1px solid ${theme.palette.divider}`,
      }),
    },
  },
};

/** Shared typography config */
const typography = {
  fontFamily: fonts.family,
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1B4F72',
      light: '#4A89B0',
      dark: '#113248',
    },
    secondary: {
      main: '#EC1C24',
      light: '#F1948A',
      dark: '#7B1113',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
    badgeBg: {
      private: 'rgba(0, 0, 0, 0.05)',
      tag: 'rgba(147, 51, 234, 0.08)',
      tagText: 'rgb(126, 34, 206)',
    },
    desktopBg: '#E5E7EB',
    desktopBorder: 'rgba(0, 0, 0, 0.06)',
    desktopFrameShadow: '0 0 24px rgba(0, 0, 0, 0.15)',
    dynamicHeaderShadow: '0 8px 20px rgba(0, 0, 0, 0.24)',
    dynamicBottomBarShadow: '0 -8px 20px rgba(0, 0, 0, 0.24)',
    roundChipBg: 'rgba(0, 0, 0, 0.55)',
    roundChipText: '#FFFFFF',
  },
  typography,
  shape: { borderRadius: shape.borderRadius },
  components: sharedComponents,
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#5dade2',
      light: '#85c1e9',
      dark: '#1B4F72',
    },
    secondary: {
      main: '#ff6f61',
      light: '#ff9a8b',
      dark: '#EC1C24',
    },
    background: {
      default: '#121212',
      paper: '#1A1A1A',
    },

    badgeBg: {
      private: 'rgba(255, 255, 255, 0.08)',
      tag: 'rgba(147, 51, 234, 0.15)',
      tagText: 'rgb(216, 180, 254)',
    },
    desktopBg: '#121212',
    desktopBorder: 'rgba(255, 255, 255, 0.05)',
    desktopFrameShadow: '0 0 24px rgba(0, 0, 0, 0.25)',
    dynamicHeaderShadow: '0 8px 24px rgba(0, 0, 0, 0.8)',
    dynamicBottomBarShadow: '0 -8px 24px rgba(0, 0, 0, 0.8)',
    roundChipBg: 'rgba(255, 255, 255, 0.55)',
    roundChipText: '#121212',
  },
  typography,
  shape: { borderRadius: shape.borderRadius },
  components: sharedComponents,
});
