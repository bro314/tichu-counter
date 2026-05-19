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
    main: '#1a73e8',
    light: '#4a9af5',
    dark: '#0d47a1',
    // Dark mode variants
    dm: { main: '#64b5f6', light: '#90caf9', dark: '#1a73e8' },
  },
  team2: {
    main: '#e8453c',
    light: '#ff6f61',
    dark: '#b71c1c',
    dm: { main: '#ff6f61', light: '#ff9a8b', dark: '#e8453c' },
  },

  // Backgrounds
  bg: {
    light: { default: '#f5f5f5', paper: '#ffffff' },
    dark: { default: '#121212', paper: '#1e1e1e' },
  },

  // Desktop frame styling
  desktopBg: {
    light: '#f0f2f5',
    dark: '#0d1117',
  },
  desktopBorder: {
    light: 'rgba(0, 0, 0, 0.06)',
    dark: 'rgba(255, 255, 255, 0.05)',
  },

  // Status bar (used by Capacitor)
  statusBar: '#0d1117',
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
