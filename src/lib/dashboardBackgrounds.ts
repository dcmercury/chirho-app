import { STOCK_GROUP_BACKGROUNDS } from "./groupBackgrounds";

export const DEFAULT_DASHBOARD_BACKGROUND = "/intro.png";

export function dashboardBackgroundGallery(
  community?: string | null,
  saved?: Array<string | null | undefined> | null,
): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of [
    DEFAULT_DASHBOARD_BACKGROUND,
    community,
    ...(saved || []),
    ...STOCK_GROUP_BACKGROUNDS,
  ]) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    urls.push(item);
  }
  return urls;
}

export function selectedDashboardBackgrounds(
  community?: string | null,
  saved?: Array<string | null | undefined> | null,
): string[] {
  const selected = (saved || []).filter((item): item is string => Boolean(item));
  if (selected.length) return Array.from(new Set(selected));
  return community ? [community] : [DEFAULT_DASHBOARD_BACKGROUND];
}
