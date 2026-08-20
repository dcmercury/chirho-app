import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet } from "react-native";
import * as SystemUI from "expo-system-ui";
import {
  loadAppearance,
  parseAppearance,
  saveAppearance,
} from "../lib/appearancePreference";
import { overlayAt, resolvePalette, resolveStatusBarStyle } from "./palettes";
import type { Appearance, ColorTokens } from "./tokens";

type ThemeContextValue = {
  appearance: Appearance;
  colors: ColorTokens;
  statusBarStyle: "light" | "dark";
  overlayAt: (opacity: number) => string;
  setAppearance: (appearance: Appearance) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>("dark");

  useEffect(() => {
    let cancelled = false;
    loadAppearance().then((stored) => {
      if (!cancelled) setAppearanceState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setAppearance = useCallback((next: Appearance) => {
    const resolved = parseAppearance(next);
    setAppearanceState(resolved);
    void saveAppearance(resolved);
  }, []);

  const colors = resolvePalette(appearance);
  const statusBarStyle = resolveStatusBarStyle(appearance);
  const overlay = useCallback(
    (opacity: number) => overlayAt(appearance, opacity),
    [appearance],
  );

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.canvas).catch(() => undefined);
  }, [colors.canvas]);

  const value = useMemo(
    () => ({
      appearance,
      colors,
      statusBarStyle,
      overlayAt: overlay,
      setAppearance,
    }),
    [appearance, colors, overlay, setAppearance, statusBarStyle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

export function useThemedStyles<
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>,
>(factory: (colors: ColorTokens) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
