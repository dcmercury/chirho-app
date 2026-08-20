export const STOCK_GROUP_BACKGROUNDS = [
  "/cover1.jpg",
  "/cover2.jpg",
  "/cover3.jpg",
  "/cover4.jpg",
  "/cover5.jpg",
  "/cover6.jpg",
  "/church.jpg",
  "/prayercards/backgrounds/church.jpg",
  "/prayercards/backgrounds/sheep.jpg",
];

export function groupBackgroundGallery(
  active?: string | null,
  saved?: Array<string | null | undefined> | null,
): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of [...(saved || []), active, ...STOCK_GROUP_BACKGROUNDS]) {
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
