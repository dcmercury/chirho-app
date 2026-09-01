import type {
  HomeLovedOne,
  LovedOneGender,
  LovedOneKind,
  PrayerFocus,
  PrayerFocusInput,
} from "../types/home";

export function normalizeSubjectName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function findDuplicateLovedOne(
  lovedOnes: HomeLovedOne[],
  name: string,
  gender: LovedOneGender | null,
  kind: LovedOneKind,
): HomeLovedOne | undefined {
  const normalizedName = normalizeSubjectName(name);
  if (!normalizedName) return undefined;
  return lovedOnes.find(
    (person) =>
      normalizeSubjectName(person.name) === normalizedName &&
      (person.kind || "person") === kind &&
      (kind === "family" || person.gender === gender),
  );
}

export function findDuplicatePrayerFocus(
  focuses: PrayerFocus[],
  candidate: Pick<
    PrayerFocusInput,
    "title" | "type" | "species" | "gender"
  >,
): PrayerFocus | undefined {
  const normalizedTitle = normalizeSubjectName(candidate.title);
  if (!normalizedTitle) return undefined;
  return focuses.find(
    (focus) =>
      focus.type === candidate.type &&
      normalizeSubjectName(focus.title) === normalizedTitle &&
      (candidate.type !== "pet" ||
        (focus.species === candidate.species &&
          focus.gender === candidate.gender)),
  );
}
