/** RGB channels so light theme can retint overlays, glass, and accent washes. */
export const ink = {
  overlay: "0, 0, 0",
  glass: "255, 255, 255",
  accent: "249, 115, 22",
  cream: "255, 248, 240",
  card: "10, 8, 7",
  success: "52, 211, 153",
} as const;

function rgba(rgb: string, alpha: number): string {
  return `rgba(${rgb}, ${alpha})`;
}

/** Photo-stage scrim. Pass cream RGB in light so type stays readable. */
export function overlayColor(opacity: number, rgb: string = ink.overlay): string {
  return rgba(rgb, opacity);
}

export const colors = {
  // Surfaces
  canvas: "#000000",
  splash: "#FDF8F3",
  loading: "#030403",
  splashSpinner: "#8B4513",

  // Brand
  accent: "#f97316",
  accentText: "#f97316",
  error: "#f87171",
  errorBg: "rgba(239, 68, 68, 0.1)",
  errorBorder: "rgba(239, 68, 68, 0.2)",
  success: "#34d399",
  successFill: rgba(ink.success, 0.12),
  successBorder: rgba(ink.success, 0.3),

  // Literal aliases — prefer role tokens below when adding new styles
  white: "#ffffff",
  black: "#000000",

  // Buttons (dark: inverted white fill / black label)
  buttonPrimary: "#ffffff",
  buttonOnPrimary: "#000000",

  // Type
  title: "#ffffff",
  titleSoft: rgba(ink.glass, 0.82),
  titleMuted: "rgba(235, 235, 235, 0.82)",
  subtitle: "rgba(255, 255, 255, 0.6)",
  subtitleStrong: rgba(ink.glass, 0.66),
  caption: "#a3a3a3",
  muted: "rgba(255, 255, 255, 0.4)",
  mutedStrong: "rgba(255, 255, 255, 0.7)",
  mutedFaint: "rgba(255, 255, 255, 0.35)",
  mutedGhost: "rgba(255, 255, 255, 0.3)",
  mutedSoft: "rgba(255, 255, 255, 0.5)",
  mutedMid: rgba(ink.glass, 0.45),
  mutedDeep: rgba(ink.glass, 0.25),
  footerLabel: "#e5e5e5",
  bodyBright: rgba(ink.glass, 0.9),
  bodyActive: rgba(ink.glass, 0.85),
  bodyOnPhoto: "rgba(220, 220, 220, 0.85)",

  // Glass — light frost over dark surfaces
  glassFill: "rgba(255, 255, 255, 0.05)",
  glassFillFaint: rgba(ink.glass, 0.04),
  glassFillHover: "rgba(255, 255, 255, 0.08)",
  glassFillStrong: "rgba(255, 255, 255, 0.1)",
  glassFillBright: rgba(ink.glass, 0.16),
  glassFillChip: rgba(ink.glass, 0.18),
  glassBorder: "rgba(255, 255, 255, 0.1)",
  glassBorderStrong: "rgba(255, 255, 255, 0.3)",
  glassBorderSoft: "rgba(255, 255, 255, 0.08)",
  glassBorderSelected: "rgba(255, 255, 255, 0.2)",
  glassBorderHairline: rgba(ink.glass, 0.12),
  glassBorderMuted: rgba(ink.glass, 0.14),
  glassBorderRow: rgba(ink.glass, 0.15),
  glassBorderInput: rgba(ink.glass, 0.16),
  glassBorderChip: rgba(ink.glass, 0.18),
  glassBorderLoud: rgba(ink.glass, 0.42),
  glassBorderLouder: rgba(ink.glass, 0.6),
  groupFill: "rgba(255, 255, 255, 0.06)",
  footerRule: "rgba(255, 255, 255, 0.1)",
  dot: "rgba(255, 255, 255, 0.2)",
  grid: "rgba(255, 255, 255, 0.1)",
  blurOrb: "#262626",

  // Photo scrims — black wash over imagery
  overlay: rgba(ink.overlay, 0.8),
  overlayDeck: rgba(ink.overlay, 0.82),
  overlayGroup: rgba(ink.overlay, 0.75),
  overlayModal: rgba(ink.overlay, 0.72),
  overlayInvite: rgba(ink.overlay, 0.67),
  overlayInviteShade: rgba(ink.overlay, 0.24),
  overlayFooter: rgba(ink.overlay, 0.74),
  overlaySoft: rgba(ink.overlay, 0.55),
  overlayThumb: rgba(ink.overlay, 0.45),
  overlayControl: rgba(ink.overlay, 0.34),
  overlayFaint: rgba(ink.overlay, 0.25),

  // Orange treatment — fills and borders
  accentFillFaint: rgba(ink.accent, 0.06),
  accentFillMuted: rgba(ink.accent, 0.09),
  accentFill: rgba(ink.accent, 0.1),
  accentFillMid: rgba(ink.accent, 0.12),
  accentFillPill: rgba(ink.accent, 0.14),
  accentFillSelected: rgba(ink.accent, 0.15),
  accentFillHeavy: rgba(ink.accent, 0.16),
  accentFillActive: rgba(ink.accent, 0.2),
  accentFillSolid: rgba(ink.accent, 0.28),
  accentBorderFaint: rgba(ink.accent, 0.15),
  accentBorder: rgba(ink.accent, 0.2),
  accentBorderMuted: rgba(ink.accent, 0.28),
  accentBorderMid: rgba(ink.accent, 0.3),
  accentBorderStrong: rgba(ink.accent, 0.38),
  accentBorderSelected: rgba(ink.accent, 0.4),
  accentBorderInvite: rgba(ink.accent, 0.42),
  accentBorderPill: rgba(ink.accent, 0.45),
  accentBorderChevron: rgba(ink.accent, 0.48),
  accentBorderActive: rgba(ink.accent, 0.65),
  accentBorderFocus: rgba(ink.accent, 0.85),

  // Cards / sheets
  badge: "rgba(0, 0, 0, 0.6)",
  badgeOrange: "rgba(249, 115, 22, 0.8)",
  cardFill: "rgba(10, 8, 7, 0.9)",
  cardFillSoft: rgba(ink.card, 0.52),
  cardFillMuted: rgba(ink.card, 0.44),
  cardBorder: "rgba(255, 248, 240, 0.2)",
  cardText: "rgba(255, 250, 245, 0.78)",
  cardMeta: "rgba(255, 250, 245, 0.58)",
  sheetFill: "rgba(12, 12, 12, 0.92)",

  // Cream (toggle thumbs, light chips on dark)
  cream: "#fffaf5",
  creamFill: rgba(ink.cream, 0.9),
  creamBorder: rgba(ink.cream, 0.36),
  creamStroke: rgba(ink.cream, 0.72),
  creamTint: rgba(ink.cream, 0.88),
} as const;

export type ColorTokens = { readonly [K in keyof typeof colors]: string };
export type Appearance = "dark" | "light";

export const fonts = {
  display: "SpaceGrotesk",
  displayMedium: "SpaceGrotesk-Medium",
  body: "Inter",
  bodyMedium: "Inter-Medium",
  bodySemi: "Inter-SemiBold",
  mono: "JetBrainsMono",
  monoMedium: "JetBrainsMono-Medium",
} as const;

export const type = {
  heading1: {
    fontFamily: fonts.displayMedium,
    fontSize: 36,
    lineHeight: 36,
    fontWeight: "500" as const,
    letterSpacing: -0.9,
  },
  subtitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 36,
    lineHeight: 36,
    fontWeight: "500" as const,
    letterSpacing: -0.9,
    color: colors.subtitle,
  },
  labelSm: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16.8,
  },
  bodySm: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  footerLabel: {
    fontFamily: fonts.displayMedium,
    fontSize: 12,
    fontWeight: "500" as const,
    color: colors.footerLabel,
  },
} as const;

export const space = {
  screen: 24,
  titleGap: 16,
  captionPad: 16,
  footerTop: 16,
  footerBottom: 24,
  cardGap: 12,
} as const;

export const radii = {
  glass: 12,
  card: 12,
  thumb: 8,
  circle: 9999,
} as const;

export const motion = {
  bgCrossfade: 500,
  enter: 800,
  stagger: [0, 200, 400, 600] as const,
  overlayFade: 800,
  overlayDelay: 300,
  videoFade: 1000,
} as const;
