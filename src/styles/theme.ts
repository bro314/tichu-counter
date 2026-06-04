import { createTheme } from '@mui/material/styles';
import { colors, fonts, shape, shadows } from './tokens';

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
  }
}

/** Shared component overrides (same for both themes) */
const sharedComponents = (mode: 'light' | 'dark') => ({
  MuiBottomNavigation: {
    styleOverrides: {
      root: {
        height: 64,
        borderTop: shadows.navBorder[mode],
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
        boxShadow: shadows.card[mode],
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
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.bg.light,

    badgeBg: {
      private: colors.badgeBg.private.light,
      tag: colors.badgeBg.tag.light,
      tagText: 'rgb(126, 34, 206)',
    },

    gameCard: {
      active: {
        bg: colors.gameCard.active.bg.light,
        border: colors.gameCard.active.border.light,
        shadow: colors.gameCard.active.shadow.light,
      },
      won: {
        bg: colors.gameCard.won.bg.light,
        border: colors.gameCard.won.border.light,
        shadow: colors.gameCard.won.shadow.light,
      },
      lost: {
        bg: colors.gameCard.lost.bg.light,
        border: colors.gameCard.lost.border.light,
        shadow: 'none',
      },
      finished: {
        bg: colors.gameCard.finished.bg.light,
        border: colors.gameCard.finished.border.light,
        shadow: 'none',
      },
      hoverBg: colors.gameCard.hoverBg.light,
    },

    desktopBg: colors.desktopBg.light,
    desktopBorder: colors.desktopBorder.light,
    desktopFrameShadow: shadows.desktopFrame.light,
    dynamicHeaderShadow: shadows.dynamicHeader.light,
    dynamicBottomBarShadow: shadows.dynamicBottomBar.light,
    settingsCardShadow: shadows.settingsCard,
  },
  typography,
  shape: { borderRadius: shape.borderRadius },
  components: sharedComponents('light'),
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: colors.primary.dm,
    secondary: colors.secondary.dm,
    background: colors.bg.dark,

    badgeBg: {
      private: colors.badgeBg.private.dark,
      tag: colors.badgeBg.tag.dark,
      tagText: 'rgb(216, 180, 254)',
    },

    gameCard: {
      active: {
        bg: colors.gameCard.active.bg.dark,
        border: colors.gameCard.active.border.dark,
        shadow: colors.gameCard.active.shadow.dark,
      },
      won: {
        bg: colors.gameCard.won.bg.dark,
        border: colors.gameCard.won.border.dark,
        shadow: colors.gameCard.won.shadow.dark,
      },
      lost: {
        bg: colors.gameCard.lost.bg.dark,
        border: colors.gameCard.lost.border.dark,
        shadow: 'none',
      },
      finished: {
        bg: colors.gameCard.finished.bg.dark,
        border: colors.gameCard.finished.border.dark,
        shadow: 'none',
      },
      hoverBg: colors.gameCard.hoverBg.dark,
    },

    desktopBg: colors.desktopBg.dark,
    desktopBorder: colors.desktopBorder.dark,
    desktopFrameShadow: shadows.desktopFrame.dark,
    dynamicHeaderShadow: shadows.dynamicHeader.dark,
    dynamicBottomBarShadow: shadows.dynamicBottomBar.dark,
    settingsCardShadow: 'none',
  },
  typography,
  shape: { borderRadius: shape.borderRadius },
  components: sharedComponents('dark'),
});
