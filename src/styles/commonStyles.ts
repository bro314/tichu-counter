/**
 * Reusable sx-style objects for common UI patterns.
 *
 * Import these instead of repeating inline sx props.
 * When the design changes, update here — all consumers update.
 */
import type { SxProps, Theme } from "@mui/material/styles";
import { fonts, shape } from "./tokens";

/** Full-height flex column (used by page roots) */
export const pageRoot: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
  overflow: "hidden",
  bgcolor: "background.default",
  position: "relative",
};

/** Scrollable content area */
export const contentArea: SxProps<Theme> = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 1,
  pb: 2,
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

/** CTA container pinned at bottom of page */
export const ctaContainer: SxProps<Theme> = {
  p: 1,
};

/** Round history chip (Tichu, GT, 1-2) */
export const historyChip: SxProps<Theme> = {
  fontSize: fonts.size.sm,
  fontWeight: fonts.weight.semibold,
  borderRadius: `${shape.smallRadius}px`,
  minWidth: 30,
  height: 20,
  "& .MuiChip-label": { p: 0 },
};

/** Timestamp / metadata text */
export const metaText: SxProps<Theme> = {
  fontSize: fonts.size.xs,
  lineHeight: fonts.lineHeight.tight,
  color: "text.disabled",
};

// ─── Round editor ─────────────────────────────────────────────

/** Player card in round editor */
export const playerCard = (_isTeam1: boolean): SxProps<Theme> => ({
  p: 1,
  bgcolor: "background.paper",
});

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
  gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))",
  gap: 0.5,
};

/** Individual avatar item */
export const avatarItem = (selected: boolean): SxProps<Theme> => ({
  fontSize: fonts.size.xxl,
  textAlign: "center",
  py: 1,
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
  p: 0,
});

/** Outer desktop page framing background */
export const desktopOuter: SxProps<Theme> = {
  width: "100%",
  height: "100%",
  bgcolor: "desktopBg",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** Responsive app frame container for centered phone feel */
export const appFrame: SxProps<Theme> = (theme) => ({
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
    borderLeft: "1px solid",
    borderRight: "1px solid",
    borderColor: "divider",
    boxShadow: theme.palette.desktopFrameShadow,
  },
});

/** Top header container with bottom border and dynamic downwards shadow */
export const dynamicHeader = (showShadow: boolean): SxProps<Theme> => (theme) => ({
  p: 1,
  flexShrink: 0,
  bgcolor: "background.default",
  borderBottom: 1,
  borderColor: "divider",
  boxShadow: showShadow ? theme.palette.dynamicHeaderShadow : "none",
  position: "relative",
  zIndex: 1,
});

/** Bottom actions container with top border and dynamic upwards shadow */
export const dynamicBottomBar = (showShadow: boolean): SxProps<Theme> => (theme) => ({
  p: 1,
  display: "flex",
  gap: 1,
  alignItems: "center",
  bgcolor: "background.default",
  borderTop: 1,
  borderColor: "divider",
  boxShadow: showShadow ? theme.palette.dynamicBottomBarShadow : "none",
  position: "relative",
  zIndex: 1,
});

export const lgEmojiFont: SxProps<Theme> = {
  fontSize: fonts.size.xl,
};

export const lgEmojiNoneFont: SxProps<Theme> = {
  fontSize: fonts.size.xl,
  lineHeight: fonts.lineHeight.none,
};

export const avatarListFont: SxProps<Theme> = {
  fontSize: fonts.size.large,
};

export const timestampFont: SxProps<Theme> = {
  color: "text.secondary",
  fontSize: fonts.size.sm,
  fontWeight: fonts.weight.regular,
  lineHeight: fonts.lineHeight.tight,
};

export const uppercaseBadgeFont: SxProps<Theme> = {
  fontSize: fonts.size.sm,
  fontWeight: fonts.weight.semibold,
  textTransform: "uppercase",
};

export const cardBadgeFont: SxProps<Theme> = {
  fontSize: fonts.size.xs,
  fontWeight: fonts.weight.semibold,
  textTransform: "uppercase",
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

/** Round score text */
export const scoreFont: SxProps<Theme> = {
  fontWeight: fonts.weight.regular,
  color: "text.primary",
  fontSize: fonts.size.xl,
};

/** Large score display font (Main scoreboard) */
export const largeScoreFont: SxProps<Theme> = {
  fontWeight: fonts.weight.regular,
  fontSize: fonts.size.xxxl,
  lineHeight: fonts.lineHeight.none,
};

/** Timestamp display in round history */
export const historyTimeFont: SxProps<Theme> = {
  fontWeight: fonts.weight.regular,
  fontSize: fonts.size.sm,
  lineHeight: fonts.lineHeight.tight,
};

/** Player name in editor card */
export const playerNameLarge: SxProps<Theme> = {
  fontWeight: fonts.weight.regular,
  fontSize: fonts.size.large,
  lineHeight: fonts.lineHeight.tight,
};
