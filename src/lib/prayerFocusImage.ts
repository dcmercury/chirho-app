import type { PrayerFocus } from "../types/home";

/** Uploaded photo if present, otherwise the tagged stock still from home. */
export function focusPhotoPath(focus: PrayerFocus): string | undefined {
  const photos = focus.photos || [];
  return (
    (photos.find((photo) => photo.isPrimary) || photos[0])?.contentPath ||
    focus.image ||
    undefined
  );
}
