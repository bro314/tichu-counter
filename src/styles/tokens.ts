/**
 * Design tokens — single source of truth for all visual constants.
 *
 * When updating the design (e.g. from Stitch), change values HERE
 * and they propagate everywhere automatically.
 */

// Note: Color palette tokens have been inlined directly into theme.ts
// to leverage MUI's automatic dark/light theme switching.

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

// Note: Shadows have been inlined directly into theme.ts
// to support automatic light/dark theme switching and clean styling.

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
