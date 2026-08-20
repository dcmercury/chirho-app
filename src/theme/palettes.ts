import {
  colors,
  ink,
  overlayColor,
  type Appearance,
  type ColorTokens,
} from "./tokens";

function rgba(rgb: string, alpha: number): string {
  return `rgba(${rgb}, ${alpha})`;
}

const stone = "28, 25, 23";
const creamWash = "253, 248, 243";
const errorLight = "220, 38, 38";
const successLight = "5, 150, 105";

export const overlayInk: Record<Appearance, string> = {
  dark: ink.overlay,
  light: creamWash,
};

export const lightColors: ColorTokens = {
  ...colors,
  canvas: "#F3F0EC",
  splash: "#FDF8F3",
  loading: "#FDF8F3",
  splashSpinner: "#8B4513",

  accent: "#f97316",
  accentText: "#C2410C",
  error: "#DC2626",
  errorBg: rgba(errorLight, 0.08),
  errorBorder: rgba(errorLight, 0.2),
  success: "#059669",
  successFill: rgba(successLight, 0.1),
  successBorder: rgba(successLight, 0.28),

  white: "#ffffff",
  black: "#000000",

  buttonPrimary: "#f97316",
  buttonOnPrimary: "#ffffff",

  title: "#1C1917",
  titleSoft: rgba(stone, 0.82),
  titleMuted: rgba(stone, 0.78),
  subtitle: rgba(stone, 0.6),
  subtitleStrong: rgba(stone, 0.66),
  caption: "#57534E",
  muted: rgba(stone, 0.45),
  mutedStrong: rgba(stone, 0.7),
  mutedFaint: rgba(stone, 0.35),
  mutedGhost: rgba(stone, 0.32),
  mutedSoft: rgba(stone, 0.5),
  mutedMid: rgba(stone, 0.45),
  mutedDeep: rgba(stone, 0.25),
  footerLabel: "#44403C",
  bodyBright: rgba(stone, 0.9),
  bodyActive: rgba(stone, 0.85),
  bodyOnPhoto: rgba(stone, 0.85),

  glassFill: rgba(stone, 0.04),
  glassFillFaint: rgba(stone, 0.03),
  glassFillHover: rgba(stone, 0.06),
  glassFillStrong: rgba(stone, 0.08),
  glassFillBright: rgba(stone, 0.12),
  glassFillChip: rgba(stone, 0.1),
  glassBorder: rgba(stone, 0.1),
  glassBorderStrong: rgba(stone, 0.22),
  glassBorderSoft: rgba(stone, 0.08),
  glassBorderSelected: rgba(stone, 0.16),
  glassBorderHairline: rgba(stone, 0.1),
  glassBorderMuted: rgba(stone, 0.12),
  glassBorderRow: rgba(stone, 0.12),
  glassBorderInput: rgba(stone, 0.14),
  glassBorderChip: rgba(stone, 0.14),
  glassBorderLoud: rgba(stone, 0.28),
  glassBorderLouder: rgba(stone, 0.4),
  groupFill: rgba(stone, 0.05),
  footerRule: rgba(stone, 0.1),
  dot: rgba(stone, 0.2),
  grid: rgba(stone, 0.12),
  blurOrb: "#E7E5E4",

  overlay: rgba(creamWash, 0.9),
  overlayDeck: rgba(creamWash, 0.9),
  overlayGroup: rgba(creamWash, 0.88),
  overlayModal: rgba(creamWash, 0.9),
  overlayInvite: rgba(creamWash, 0.86),
  overlayInviteShade: rgba(creamWash, 0.28),
  overlayFooter: rgba(creamWash, 0.88),
  overlaySoft: rgba(ink.overlay, 0.55),
  overlayThumb: rgba(ink.overlay, 0.45),
  overlayControl: rgba(ink.overlay, 0.34),
  overlayFaint: rgba(ink.overlay, 0.25),

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

  badge: "rgba(0, 0, 0, 0.6)",
  badgeOrange: "rgba(249, 115, 22, 0.8)",
  cardFill: "#FFFFFF",
  cardFillSoft: "rgba(255, 255, 255, 0.92)",
  cardFillMuted: "rgba(255, 255, 255, 0.86)",
  cardBorder: rgba(stone, 0.1),
  cardText: rgba(stone, 0.78),
  cardMeta: rgba(stone, 0.55),
  sheetFill: "rgba(255, 255, 255, 0.96)",

  cream: "#fffaf5",
  creamFill: rgba(ink.cream, 0.9),
  creamBorder: rgba(stone, 0.16),
  creamStroke: rgba(stone, 0.55),
  creamTint: "#8B4513",
};

export const palettes: { dark: ColorTokens; light: ColorTokens } = {
  dark: colors,
  light: lightColors,
};

export function resolvePalette(appearance: Appearance): ColorTokens {
  return appearance === "light" ? palettes.light : palettes.dark;
}

/** Dark theme uses light status-bar content (white icons). */
export function resolveStatusBarStyle(
  appearance: Appearance,
): "light" | "dark" {
  return appearance === "light" ? "dark" : "light";
}

export function overlayAt(appearance: Appearance, opacity: number): string {
  const amount =
    appearance === "light" ? Math.min(0.92, opacity + 0.28) : opacity;
  return overlayColor(amount, overlayInk[appearance]);
}
