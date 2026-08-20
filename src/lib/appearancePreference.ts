import * as SecureStore from "expo-secure-store";
import type { Appearance } from "../theme/tokens";

const KEY = "chirho.appearance";

export function parseAppearance(value: unknown): Appearance {
  return value === "light" ? "light" : "dark";
}

export async function loadAppearance(): Promise<Appearance> {
  try {
    return parseAppearance(await SecureStore.getItemAsync(KEY));
  } catch {
    return "dark";
  }
}

export async function saveAppearance(appearance: Appearance): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, appearance);
  } catch {
    // Device storage can fail on web or locked stores; in-memory theme still applies.
  }
}
