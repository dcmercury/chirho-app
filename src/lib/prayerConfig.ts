export const PRAYER_CATEGORIES = [
  { id: "home", label: "Home" },
  { id: "work", label: "Work" },
  { id: "school", label: "School" },
  { id: "health", label: "Health" },
  { id: "family", label: "Family" },
  { id: "friends", label: "Friends" },
  { id: "church", label: "Church" },
  { id: "finances", label: "Finances" },
] as const;

export const PRAYER_VIRTUES = [
  { id: "patience", label: "Patience" },
  { id: "mercy", label: "Mercy" },
  { id: "grace", label: "Grace" },
  { id: "love", label: "Love" },
  { id: "peace", label: "Peace" },
  { id: "kindness", label: "Kindness" },
  { id: "strength", label: "Strength" },
  { id: "wisdom", label: "Wisdom" },
] as const;

export type PrayerCategoryId = (typeof PRAYER_CATEGORIES)[number]["id"];
export type PrayerVirtueId = (typeof PRAYER_VIRTUES)[number]["id"];

export interface LovedOnePrayerConfiguration {
  category: string;
  virtues: string[];
}

export function prayerCategoryLabel(id: string): string {
  return PRAYER_CATEGORIES.find((item) => item.id === id)?.label || id;
}

export function prayerVirtueLabel(id: string): string {
  return PRAYER_VIRTUES.find((item) => item.id === id)?.label || id;
}
