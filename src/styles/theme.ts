import { createTheme } from '@mui/material/styles';
import { fonts, shape } from './tokens';

// Declare custom properties on MUI's Palette
declare module '@mui/material/styles' {
  interface Palette {
    badgeBg: {
      private: string;
      tag: string;
      tagText: string;
    };
    gameCard: {
      active: { bg: string; border: string; shadow: string };
      won: { bg: string; border: string; shadow: string };
      lost: { bg: string; border: string; shadow: string };
      finished: { bg: string; border: string; shadow: string };
      hoverBg: string;
    };
    desktopBg: string;
    desktopBorder: string;
    desktopFrameShadow: string;
    dynamicHeaderShadow: string;
    dynamicBottomBarShadow: string;
    settingsCardShadow: string;
    ctaGlow: string;
    authLogoGlow: string;
  }

  interface PaletteOptions {
    badgeBg?: {
      private?: string;
      tag?: string;
      tagText?: string;
    };
    gameCard?: {
      active?: { bg?: string; border?: string; shadow?: string };
      won?: { bg?: string; border?: string; shadow?: string };
      lost?: { bg?: string; border?: string; shadow?: string };
      finished?: { bg?: string; border?: string; shadow?: string };
      hoverBg?: string;
    };
    desktopBg?: string;
    desktopBorder?: string;
    desktopFrameShadow?: string;
    dynamicHeaderShadow?: string;
    dynamicBottomBarShadow?: string;
    settingsCardShadow?: string;
    ctaGlow?: string;
    authLogoGlow?: string;
  }
}

/** Shared component overrides (same for both themes) */
const sharedComponents = (mode: 'light' | 'dark') => ({
  MuiBottomNavigation: {
    styleOverrides: {
      root: {
        height: 64,
        borderTop: mode === 'light'
          ? '1px solid rgba(0, 0, 0, 0.08)'
          : '1px solid rgba(255, 255, 255, 0.08)',
      },
    },
  },
  MuiBottomNavigationAction: {
    styleOverrides: {
      root: {
        minWidth: 60,
        '&.Mui-selected': {
          fontSize: fonts.size.xl,
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        boxShadow: mode === 'light'
          ? '0 2px 12px rgba(0, 0, 0, 0.08)'
          : '0 2px 12px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none' as const,
        fontWeight: fonts.weight.semibold,
        borderRadius: shape.buttonRadius,
      },
    },
  },
});

/** Shared typography config */
const typography = {
  fontFamily: fonts.family,
  h5: { fontWeight: fonts.weight.bold },
  h6: { fontWeight: fonts.weight.semibold },
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
      default: '#F9F6F0',
      paper: '#FFF8E1',
    },

    badgeBg: {
      private: 'rgba(0, 0, 0, 0.05)',
      tag: 'rgba(147, 51, 234, 0.08)',
      tagText: 'rgb(126, 34, 206)',
    },

    gameCard: {
      active: {
        bg: '#FFFDF0',
        border: '#FEF3C7',
        shadow: '0 4px 14px rgba(245, 158, 11, 0.08)',
      },
      won: {
        bg: '#F0FDF4',
        border: '#DCFCE7',
        shadow: '0 4px 14px rgba(34, 197, 94, 0.08)',
      },
      lost: {
        bg: '#FEF2F2',
        border: '#FEE2E2',
        shadow: 'none',
      },
      finished: {
        bg: '#F9FAFB',
        border: '#E5E7EB',
        shadow: 'none',
      },
      hoverBg: 'rgba(0, 0, 0, 0.02)',
    },

    desktopBg: '#EFEBE4',
    desktopBorder: 'rgba(0, 0, 0, 0.06)',
    desktopFrameShadow: '0 0 24px rgba(0, 0, 0, 0.15)',
    dynamicHeaderShadow: '0 8px 20px rgba(0, 0, 0, 0.24)',
    dynamicBottomBarShadow: '0 -8px 20px rgba(0, 0, 0, 0.24)',
    settingsCardShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    ctaGlow: '0 4px 14px rgba(26, 115, 232, 0.4)',
    authLogoGlow: 'drop-shadow(0 4px 16px rgba(27, 79, 114, 0.3))',
  },
  typography,
  shape: { borderRadius: shape.borderRadius },
  components: sharedComponents('light'),
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

    gameCard: {
      active: {
        bg: 'rgba(245, 158, 11, 0.08)',
        border: 'rgba(245, 158, 11, 0.25)',
        shadow: '0 4px 20px rgba(245, 158, 11, 0.1)',
      },
      won: {
        bg: 'rgba(34, 197, 94, 0.08)',
        border: 'rgba(34, 197, 94, 0.25)',
        shadow: '0 4px 20px rgba(34, 197, 94, 0.1)',
      },
      lost: {
        bg: 'rgba(239, 68, 68, 0.08)',
        border: 'rgba(239, 68, 68, 0.25)',
        shadow: 'none',
      },
      finished: {
        bg: 'rgba(255, 255, 255, 0.02)',
        border: 'rgba(255, 255, 255, 0.05)',
        shadow: 'none',
      },
      hoverBg: 'rgba(255, 255, 255, 0.04)',
    },

    desktopBg: '#121212',
    desktopBorder: 'rgba(255, 255, 255, 0.05)',
    desktopFrameShadow: '0 0 24px rgba(0, 0, 0, 0.25)',
    dynamicHeaderShadow: '0 8px 24px rgba(0, 0, 0, 0.8)',
    dynamicBottomBarShadow: '0 -8px 24px rgba(0, 0, 0, 0.8)',
    settingsCardShadow: 'none',
    ctaGlow: '0 4px 14px rgba(26, 115, 232, 0.4)',
    authLogoGlow: 'drop-shadow(0 4px 16px rgba(27, 79, 114, 0.3))',
  },
  typography,
  shape: { borderRadius: shape.borderRadius },
  components: sharedComponents('dark'),
});
