/**
 * Reusable sx-style objects for common UI patterns.
 *
 * Import these instead of repeating inline sx props.
 * When the design changes, update here — all consumers update.
 */
import type { SxProps, Theme } from "@mui/material/styles";
import { fonts, shadows, shape, colors } from "./tokens";

// ─── Layout ───────────────────────────────────────────────────

/** Full-height flex column (used by page roots) */
export const pageRoot: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "auto",
};

/** Centered content (loading spinners, empty states) */
export const centered: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
};

/** Standard scrollable list container */
export const scrollableList: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  gap: 1,
  pb: 2,
};

// ─── Buttons ──────────────────────────────────────────────────

/** Primary CTA button (Start New Game, Add Round) */
export const ctaButton: SxProps<Theme> = {
  py: 1.5,
  fontSize: fonts.size.normal,
  borderRadius: `${shape.buttonRadius}px`,
  boxShadow: shadows.ctaGlow,
};

/** CTA container pinned at bottom of page */
export const ctaContainer: SxProps<Theme> = {
  px: 2,
  pb: 2,
  pt: 1,
};

// ─── Score display ────────────────────────────────────────────

/** Score header wrapper (game page top section) */
export const scoreHeader: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 1,
  py: 2,
  px: 1,
  bgcolor: "background.paper",
  borderBottom: 1,
  borderColor: "divider",
};

/** Team name label in score header */
export const teamLabel = (_color: "primary" | "secondary"): SxProps<Theme> => ({
  fontWeight: fonts.weight.semibold,
  fontSize: fonts.size.xs,
  color: "text.secondary",
});

/** Large score number */
export const scoreNumber = (
  _color: "primary" | "secondary",
): SxProps<Theme> => ({
  fontWeight: fonts.weight.bold,
  color: "text.primary",
  fontFamily: fonts.mono,
});

/** Colon separator between scores */
export const scoreSeparator: SxProps<Theme> = {
  fontWeight: fonts.weight.regular,
  color: "text.secondary",
  fontFamily: fonts.mono,
};

// ─── Round history ────────────────────────────────────────────

/** Round history chip (Tichu, GT, 1-2) */
export const historyChip: SxProps<Theme> = {
  height: 18,
  fontSize: fonts.size.sm,
  fontWeight: 700,
  "& .MuiChip-label": {
    px: 0.75,
  },
};

/** Round score text */
export const roundScore = (
  _color: "primary" | "secondary",
): SxProps<Theme> => ({
  fontWeight: fonts.weight.bold,
  color: "text.primary",
  fontSize: fonts.size.normal,
  fontFamily: fonts.mono,
});

/** Timestamp / metadata text */
export const metaText: SxProps<Theme> = {
  fontSize: fonts.size.xs,
  color: "text.disabled",
};

// ─── Round editor ─────────────────────────────────────────────

/** Player card in round editor */
export const playerCard = (_isTeam1: boolean): SxProps<Theme> => ({
  p: 1.5,
  bgcolor: "background.paper",
});

/** Player name in editor card */
export const playerName: SxProps<Theme> = {
  fontWeight: fonts.weight.semibold,
  mb: 1,
  fontSize: fonts.size.sm,
};

/** Toggle chip in editor (Tichu, GT, 1st) */
export const editorChip: SxProps<Theme> = {
  fontSize: fonts.size.sm,
  height: 26,
  "&.MuiChip-outlined": {
    bgcolor: "background.paper",
  },
};

/** 1-2 Victory chip */
export const victoryChip: SxProps<Theme> = {
  height: 32,
  fontSize: fonts.size.sm,
  fontWeight: fonts.weight.semibold,
  "&.MuiChip-outlined": {
    bgcolor: "background.paper",
  },
};

/** Score preview card */
export const previewCard: SxProps<Theme> = {
  px: 2,
  py: 1.5,
  mb: 2,
  bgcolor: "action.hover",
};

// ─── Delete button ────────────────────────────────────────────

/** Subtle delete icon button */
export const deleteButton: SxProps<Theme> = {
  ml: 0.5,
  opacity: 0.4,
  "&:hover": { opacity: 1 },
  p: 1,
};

// ─── Avatar grid ──────────────────────────────────────────────

/** Scrollable avatar grid container */
export const avatarGridContainer: SxProps<Theme> = {
  overflow: "auto",
  mb: 3,
  border: 1,
  borderColor: "divider",
  borderRadius: `${shape.borderRadius}px`,
  p: 1,
  msOverflowStyle: "none",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": {
    display: "none",
  },
};

/** Avatar grid layout */
export const avatarGrid: SxProps<Theme> = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: 1,
};

/** Individual avatar item */
export const avatarItem = (selected: boolean): SxProps<Theme> => ({
  fontSize: fonts.size.xxl,
  textAlign: "center",
  py: 0.8,
  borderRadius: 2,
  cursor: "pointer",
  border: 2,
  borderColor: selected ? "primary.main" : "transparent",
  bgcolor: selected ? "action.selected" : "transparent",
  transition: "all 0.15s ease",
  "&:hover": { bgcolor: "action.hover" },
});

/** Avatar item in settings dialog (slightly larger) */
export const avatarItemLarge = (selected: boolean): SxProps<Theme> => ({
  ...avatarItem(selected),
  fontSize: fonts.size.xxxl,
  py: 1,
});

/** Outer desktop page framing background */
export const desktopOuter: SxProps<Theme> = {
  width: "100%",
  height: "100%",
  bgcolor: (theme) =>
    theme.palette.mode === "dark"
      ? colors.desktopBg.dark
      : colors.desktopBg.light,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** Responsive app frame container for centered phone feel */
export const appFrame: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
  maxWidth: 400,
  mx: "auto",
  bgcolor: "background.default",
  borderLeft: "none",
  borderRight: "none",
  boxShadow: "none",
  position: "relative",
  "@media (min-width: 400px)": {
    borderLeft: (theme) =>
      `1px solid ${theme.palette.mode === "dark" ? colors.desktopBorder.dark : colors.desktopBorder.light}`,
    borderRight: (theme) =>
      `1px solid ${theme.palette.mode === "dark" ? colors.desktopBorder.dark : colors.desktopBorder.light}`,
    boxShadow: (theme) =>
      theme.palette.mode === "dark"
        ? shadows.desktopFrame.dark
        : shadows.desktopFrame.light,
  },
};

/** Top header container with bottom border and dynamic downwards shadow */
export const dynamicHeader = (showShadow: boolean): SxProps<Theme> => ({
  px: 2,
  pt: 2,
  pb: 1.5,
  flexShrink: 0,
  bgcolor: "background.default",
  borderBottom: 1,
  borderColor: "divider",
  boxShadow: showShadow
    ? (theme) =>
      theme.palette.mode === "dark"
        ? "0 8px 24px rgba(0, 0, 0, 0.8)"
        : "0 8px 20px rgba(0, 0, 0, 0.24)"
    : "none",
  position: "relative",
  zIndex: 1,
});

/** Bottom actions container with top border and dynamic upwards shadow */
export const dynamicBottomBar = (showShadow: boolean): SxProps<Theme> => ({
  px: 2,
  pb: 2,
  pt: 1.5,
  display: "flex",
  gap: 1.5,
  alignItems: "center",
  bgcolor: "background.default",
  borderTop: 1,
  borderColor: "divider",
  boxShadow: showShadow
    ? (theme) =>
      theme.palette.mode === "dark"
        ? "0 -8px 24px rgba(0, 0, 0, 0.8)"
        : "0 -8px 20px rgba(0, 0, 0, 0.24)"
    : "none",
  position: "relative",
  zIndex: 1,
});

// ─── Font Styles ──────────────────────────────────────────────

/** Extrabold header font (App name header) */
export const h6HeaderFont: SxProps<Theme> = {
  fontWeight: fonts.weight.bold,
  letterSpacing: fonts.letterSpacing.tight,
};

/** Large bold font (h5 titles, active card colons) */
export const boldFont: SxProps<Theme> = {
  fontWeight: fonts.weight.bold,
};

/** Semibold font (labels, menu items) */
export const semiboldFont: SxProps<Theme> = {
  fontWeight: fonts.weight.semibold,
};

/** Medium font weight (timestamps, text) */
export const mediumFont: SxProps<Theme> = {
  fontWeight: fonts.weight.medium,
};

/** Large emoji / flag size */
export const lgEmojiFont: SxProps<Theme> = {
  fontSize: fonts.size.xl,
};

/** Large emoji / flag size with no line height */
export const lgEmojiNoneFont: SxProps<Theme> = {
  fontSize: fonts.size.xl,
  lineHeight: fonts.lineHeight.none,
};

/** Standard list avatar emoji size */
export const avatarListFont: SxProps<Theme> = {
  fontSize: fonts.size.large,
};

/** Timestamp layout for dialog toolbars */
export const timestampFont: SxProps<Theme> = {
  fontSize: fonts.size.sm,
  fontWeight: fonts.weight.medium,
  lineHeight: fonts.lineHeight.tight,
};

/** Standard badge font with uppercase text (Tag, Private badges on chip) */
export const uppercaseBadgeFont: SxProps<Theme> = {
  fontSize: fonts.size.sm,
  fontWeight: fonts.weight.bold,
  textTransform: "uppercase",
  letterSpacing: fonts.letterSpacing.wide,
};

/** Smaller extrabold uppercase badge font (Private, Tag on card) */
export const cardBadgeFont: SxProps<Theme> = {
  fontSize: fonts.size.xs,
  fontWeight: fonts.weight.bold,
  textTransform: "uppercase",
  letterSpacing: fonts.letterSpacing.wide,
  lineHeight: fonts.lineHeight.none,
};

/** Standard avatar icon size with no line height */
export const avatarIconFont: SxProps<Theme> = {
  fontSize: fonts.size.normal,
  lineHeight: fonts.lineHeight.none,
};

/** Medium icon font size */
export const mdIconFont: SxProps<Theme> = {
  fontSize: fonts.size.md,
};

/** Small icon font size */
export const smIconFont: SxProps<Theme> = {
  fontSize: fonts.size.sm,
};

/** Large score display font (Main scoreboard) */
export const largeScoreFont: SxProps<Theme> = {
  fontWeight: fonts.weight.bold,
  lineHeight: fonts.lineHeight.none,
  fontFamily: fonts.mono,
};

/** Timestamp display in round history */
export const historyTimeFont: SxProps<Theme> = {
  fontWeight: fonts.weight.medium,
  fontSize: fonts.size.sm,
  lineHeight: fonts.lineHeight.tight,
};

/** Medium avatar font inside lists/history */
export const avatarMediumFont: SxProps<Theme> = {
  fontSize: fonts.size.md,
  lineHeight: fonts.lineHeight.none,
};

/** Editor label/chip font */
export const editorChipFont: SxProps<Theme> = {
  fontSize: fonts.size.sm,
};

