import { Platform } from "react-native";

// Tokens mirrored from settlr-design/src/styles/tokens.css (--st-*)
// Keep legacy aliases for mobile code (cream/paper/sage/etc) while
// deriving from the canonical design tokens.
export const tokens = {
  canvas: "#F5F7F3",
  surface: "#FFFFFF",
  surfaceMuted: "#EAF0EC",
  ink: "#16231D",
  muted: "#66736D",
  border: "#D4DED8",
  primary: "#0B6B57",
  primaryStrong: "#074A3D",
  accent: "#82D9B7",
  positive: "#167653",
  negative: "#B94A42",
  warning: "#8A5A0A",
  radiusSm: 8,
  radiusMd: 14,
  radiusLg: 22,
  shadow: "0 12px 32px rgba(22, 35, 29, .08)",
} as const;

export const colors = {
  ink: tokens.ink,
  muted: tokens.muted,
  subtle: "#8A9992",
  cream: tokens.canvas,
  paper: tokens.surface,
  sage: tokens.surfaceMuted,
  teal: tokens.primary,
  tealPressed: tokens.primaryStrong,
  coral: tokens.negative,
  coralSoft: "#FCEBEC",
  line: tokens.border,
  gold: tokens.warning,
  goldSoft: "#FFF3D9",
  white: tokens.surface,
  accent: tokens.accent,
  positive: tokens.positive,
  badge: "#ff3b30",
  unread: "#f1f8f4",
  dangerBg: "#fff1f1",
  dangerBorder: "#e8c4c5",
  warningBg: "#FFF3D9",
  altGoldBg: "#f8ead4",
  backdrop: "rgba(8,20,16,.55)",
} as const;

export const radii = {
  sm: tokens.radiusSm,
  md: tokens.radiusMd,
  lg: tokens.radiusLg,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: radii.sm, md: radii.md, lg: radii.lg } as const;

export const type = {
  title: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia",
  }),
};
export const shadow = {
  shadowColor: tokens.ink,
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
} as const;
