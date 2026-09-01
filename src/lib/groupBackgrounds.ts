import { FALLBACK_PRAYER_IMAGE } from "./assets";

/**
 * Stock art lives in the admin-managed library, so callers pass the fetched
 * list in. This only covers the case where the library has not loaded yet.
 */
export const FALLBACK_BACKGROUNDS = [FALLBACK_PRAYER_IMAGE];

export function groupBackgroundGallery(
  active?: string | null,
  saved?: Array<string | null | undefined> | null,
  stock?: ReadonlyArray<string> | null,
): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const library = stock?.length ? stock : FALLBACK_BACKGROUNDS;
  for (const item of [...(saved || []), active, ...library]) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    urls.push(item);
  }
  return urls;
}

export function selectedGroupBackgrounds(
  active?: string | null,
  saved?: Array<string | null | undefined> | null,
): string[] {
  const selected = (saved || []).filter((item): item is string => Boolean(item));
  if (selected.length) return Array.from(new Set(selected));
  return active ? [active] : [];
}
