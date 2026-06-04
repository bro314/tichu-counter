/**
 * Design tokens — single source of truth for all visual constants.
 */

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

export const shape = {
  borderRadius: 8,
  buttonRadius: 8,
  smallRadius: 4,
} as const;
