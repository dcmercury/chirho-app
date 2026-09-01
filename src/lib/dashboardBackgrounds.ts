import { DEFAULT_BACKGROUND } from "./assets";

export const DEFAULT_DASHBOARD_BACKGROUND = DEFAULT_BACKGROUND;

export function dashboardBackgroundGallery(
  community?: string | null,
  saved?: Array<string | null | undefined> | null,
  stock?: ReadonlyArray<string> | null,
): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of [
    DEFAULT_DASHBOARD_BACKGROUND,
    community,
    ...(saved || []),
    ...(stock || []),
  ]) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    urls.push(item);
  }
  return urls;
}

/**
 * What the home screen actually rotates. An empty selection falls back to the
 * live library so admin changes reach anyone who never picked their own.
 */
export function selectedDashboardBackgrounds(
  community?: string | null,
  saved?: Array<string | null | undefined> | null,
  stock?: ReadonlyArray<string> | null,
): string[] {
  const selected = (saved || []).filter((item): item is string => Boolean(item));
  if (selected.length) return Array.from(new Set(selected));
  if (community) return [community];
  if (stock?.length) return [...stock];
  return [DEFAULT_DASHBOARD_BACKGROUND];
}
