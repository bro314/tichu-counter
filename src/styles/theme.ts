import { createTheme } from '@mui/material/styles';
import { colors, fonts, shape, shadows } from './tokens';

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
    primary: colors.team1,
    secondary: colors.team2,
    background: colors.bg.light,
  },
  typography,
  shape: { borderRadius: shape.borderRadius },
  components: sharedComponents('light'),
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: colors.team1.dm,
    secondary: colors.team2.dm,
    background: colors.bg.dark,
  },
  typography,
  shape: { borderRadius: shape.borderRadius },
  components: sharedComponents('dark'),
});
