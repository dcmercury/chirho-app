export const colors = {
  canvas: "#000000",
  splash: "#FDF8F3",
  accent: "#f97316",
  error: "#f87171",
  errorBg: "rgba(239, 68, 68, 0.1)",
  errorBorder: "rgba(239, 68, 68, 0.2)",
  white: "#ffffff",
  black: "#000000",
  title: "#ffffff",
  subtitle: "rgba(255, 255, 255, 0.6)",
  caption: "#a3a3a3",
  muted: "rgba(255, 255, 255, 0.4)",
  mutedStrong: "rgba(255, 255, 255, 0.7)",
  mutedFaint: "rgba(255, 255, 255, 0.35)",
  mutedGhost: "rgba(255, 255, 255, 0.3)",
  mutedSoft: "rgba(255, 255, 255, 0.5)",
  footerLabel: "#e5e5e5",
  glassFill: "rgba(255, 255, 255, 0.05)",
  glassFillHover: "rgba(255, 255, 255, 0.08)",
  glassFillStrong: "rgba(255, 255, 255, 0.1)",
  glassBorder: "rgba(255, 255, 255, 0.1)",
  glassBorderStrong: "rgba(255, 255, 255, 0.3)",
  glassBorderSoft: "rgba(255, 255, 255, 0.08)",
  glassBorderSelected: "rgba(255, 255, 255, 0.2)",
  groupFill: "rgba(255, 255, 255, 0.06)",
  footerRule: "rgba(255, 255, 255, 0.1)",
  dot: "rgba(255, 255, 255, 0.2)",
  grid: "rgba(255, 255, 255, 0.1)",
  blurOrb: "#262626",
  badge: "rgba(0, 0, 0, 0.6)",
  badgeOrange: "rgba(249, 115, 22, 0.8)",
} as const;

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
