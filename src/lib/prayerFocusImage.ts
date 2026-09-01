import type { PrayerFocus } from "../types/home";

export function focusImagePaths(focus: PrayerFocus): string[] {
  const paths = [...(focus.photos || [])]
    .sort(
      (left, right) =>
        Number(Boolean(right.isPrimary)) - Number(Boolean(left.isPrimary)),
    )
    .map((photo) => photo.contentPath)
    .filter(Boolean);
  if (!paths.length && focus.image) {
    paths.push(focus.image);
  }
  return paths;
}

/** Uploaded photo if present, otherwise the tagged stock still from home. */
export function focusPhotoPath(focus: PrayerFocus): string | undefined {
  return focusImagePaths(focus)[0];
}
