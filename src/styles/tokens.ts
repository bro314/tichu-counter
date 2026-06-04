/**
 * Design tokens — single source of truth for all visual constants.
 *
 * When updating the design (e.g. from Stitch), change values HERE
 * and they propagate everywhere automatically.
 */

// ─── Color Palette ────────────────────────────────────────────
export const colors = {
  // Team colors
  primary: {
    main: '#1B4F72',
    light: '#4A89B0',
    dark: '#113248',
    // Dark mode variants
    dm: { main: '#5dade2', light: '#85c1e9', dark: '#1B4F72' },
  },
  secondary: {
    main: '#EC1C24',
    light: '#F1948A',
    dark: '#7B1113',
    dm: { main: '#ff6f61', light: '#ff9a8b', dark: '#EC1C24' },
  },

  // Backgrounds
  bg: {
    light: { default: '#F9F6F0', paper: '#FFF8E1' },
    dark: { default: '#121212', paper: '#1A1A1A' },
  },

  // Desktop frame styling
  desktopBg: {
    light: '#EFEBE4',
    dark: '#121212',
  },
  desktopBorder: {
    light: 'rgba(0, 0, 0, 0.06)',
    dark: 'rgba(255, 255, 255, 0.05)',
  },

  // Status bar (used by Capacitor)
  statusBar: '#1A1A1A',

  // Badge backgrounds
  badgeBg: {
    private: {
      light: 'rgba(0, 0, 0, 0.05)',
      dark: 'rgba(255, 255, 255, 0.08)',
    },
    tag: {
      light: 'rgba(147, 51, 234, 0.08)',
      dark: 'rgba(147, 51, 234, 0.15)',
    },
  },

  // GameCard theme styles based on gameResult ('active' | 'won' | 'lost' | 'finished')
  gameCard: {
    active: {
      bg: { light: '#FFFDF0', dark: 'rgba(245, 158, 11, 0.08)' },
      border: { light: '#FEF3C7', dark: 'rgba(245, 158, 11, 0.25)' },
      shadow: { light: '0 4px 14px rgba(245, 158, 11, 0.08)', dark: '0 4px 20px rgba(245, 158, 11, 0.1)' }
    },
    won: {
      bg: { light: '#F0FDF4', dark: 'rgba(34, 197, 94, 0.08)' },
      border: { light: '#DCFCE7', dark: 'rgba(34, 197, 94, 0.25)' },
      shadow: { light: '0 4px 14px rgba(34, 197, 94, 0.08)', dark: '0 4px 20px rgba(34, 197, 94, 0.1)' }
    },
    lost: {
      bg: { light: '#FEF2F2', dark: 'rgba(239, 68, 68, 0.08)' },
      border: { light: '#FEE2E2', dark: 'rgba(239, 68, 68, 0.25)' }
    },
    finished: {
      bg: { light: '#F9FAFB', dark: 'rgba(255, 255, 255, 0.02)' },
      border: { light: '#E5E7EB', dark: 'rgba(255, 255, 255, 0.05)' }
    },
    hoverBg: {
      light: 'rgba(0, 0, 0, 0.02)',
      dark: 'rgba(255, 255, 255, 0.04)'
    }
  },
} as const;

// ─── Typography ───────────────────────────────────────────────
export const fonts = {
  family: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  size: {
    xs: '0.6rem',
    sm: '0.75rem',
    md: '0.9rem',
    normal: '1rem',
    large: '1.2rem',
    xl: '1.4rem',
    xxl: '1.6rem',
    xxxl: '1.8rem',
  },
  letterSpacing: {
    tight: -0.5,
    normal: 'normal',
    wide: 0.5,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    historyTime: 1.2,
    normal: 1.5,
  },
} as const;

// ─── Shape ────────────────────────────────────────────────────
export const shape = {
  /** Global border radius for cards, dialogs, etc. */
  borderRadius: 12,
  /** Buttons use a smaller radius */
  buttonRadius: 8,
  /** CTA pill buttons */
  ctaRadius: 3, // MUI spacing units → 24px
} as const;

// ─── Spacing ──────────────────────────────────────────────────
export const spacing = {
  /** Standard page horizontal padding */
  pagePx: 1,
  /** Bottom nav height */
  navHeight: 64,
} as const;

// ─── Shadows ──────────────────────────────────────────────────
export const shadows = {
  card: {
    light: '0 2px 12px rgba(0, 0, 0, 0.08)',
    dark: '0 2px 12px rgba(0, 0, 0, 0.3)',
  },
  /** Primary CTA glow */
  ctaGlow: `0 4px 14px rgba(26, 115, 232, 0.4)`,
  /** Subtle borders for nav bar */
  navBorder: {
    light: '1px solid rgba(0, 0, 0, 0.08)',
    dark: '1px solid rgba(255, 255, 255, 0.08)',
  },
  desktopFrame: {
    light: '0 0 24px rgba(0, 0, 0, 0.15)',
    dark: '0 0 24px rgba(0, 0, 0, 0.25)',
  },
  /** Logo shadow on AuthPage */
  authLogoGlow: 'drop-shadow(0 4px 16px rgba(27, 79, 114, 0.3))',
  /** Settings page list card shadow */
  settingsCard: '0 2px 8px rgba(0, 0, 0, 0.04)',
  /** Header drop shadow when scrolled */
  dynamicHeader: {
    light: '0 8px 20px rgba(0, 0, 0, 0.24)',
    dark: '0 8px 24px rgba(0, 0, 0, 0.8)',
  },
  /** Bottom action bar shadow when there is more content to scroll */
  dynamicBottomBar: {
    light: '0 -8px 20px rgba(0, 0, 0, 0.24)',
    dark: '0 -8px 24px rgba(0, 0, 0, 0.8)',
  },
} as const;

// ─── Component-specific sizes ─────────────────────────────────
export const componentSizes = {
  /** Chip height in round history */
  historyChip: 20,
  /** Chip height in round editor */
  editorChip: 26,
  /** 1-2 Victory chip height */
  victoryChip: 32,
  /** Status chip in game list */
  statusChip: 22,
  /** Avatar scroll container max height */
  avatarGridMaxHeight: 180,
  /** Delete icon size */
  deleteIcon: 20,
} as const;
