/**
 * Design tokens — single source of truth for all visual constants.
 *
 * When updating the design (e.g. from Stitch), change values HERE
 * and they propagate everywhere automatically.
 */

// ─── Color Palette ────────────────────────────────────────────
export const colors = {
  // Team colors
  team1: {
    main: '#1B4F72',
    light: '#4A89B0',
    dark: '#113248',
    // Dark mode variants
    dm: { main: '#5dade2', light: '#85c1e9', dark: '#1B4F72' },
  },
  team2: {
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
} as const;

// ─── Typography ───────────────────────────────────────────────
export const fonts = {
  family: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  size: {
    /** Tiny labels, timestamps */
    xs: '0.6rem',
    /** Small captions, chip labels */
    sm: '0.65rem',
    /** Chip text */
    chip: '0.7rem',
    /** Editor labels */
    editorChip: '0.8rem',
    /** Nav selected label */
    navLabel: '0.75rem',
    /** CTA buttons */
    cta: '1rem',
    /** Avatar emoji in settings dialog */
    avatarLarge: '1.8rem',
    /** Avatar emoji in onboarding/profile */
    avatarSmall: '1.6rem',
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
  pagePx: 2,
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
} as const;

// ─── Gradients ────────────────────────────────────────────────
export const gradients = {
  /** Slider track */
  sliderTrack: `linear-gradient(90deg, ${colors.team1.main}, ${colors.team2.main})`,
  /** Auth page logo */
  authLogo: `linear-gradient(135deg, ${colors.team1.main} 0%, ${colors.team2.main} 100%)`,
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
