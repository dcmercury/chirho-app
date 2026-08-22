import * as SecureStore from "expo-secure-store";
import {
  communityAllowsDailyPrayers,
  communityAllowsPersonalPrayer,
  type HomeCommunity,
  type HomeData,
  type PersonalPlan,
} from "../types/home";

export type SetupChapter = "background" | "group" | "lovedOne" | "prayer";

const keyFor = (userId: string) => `chirho.setupOnboarding.${userId}`;

export async function isSetupOnboardingComplete(userId: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(keyFor(userId))) === "complete";
  } catch {
    return false;
  }
}

export async function markSetupOnboardingComplete(userId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(keyFor(userId), "complete");
  } catch {
    // Device storage can fail; in-memory skip still applies for this session.
  }
}

export function hasExistingSetupData(home: HomeData): boolean {
  const lovedOneCount =
    (home.lovedOnes?.length || 0) +
    (home.profile?.managedLovedOnes?.length || 0);
  return (
    lovedOneCount > 0 ||
    (home.groups?.length || 0) > 0 ||
    (home.cards?.length || 0) > 0 ||
    (home.prayerFocuses?.length || 0) > 0 ||
    Boolean(home.dailyDeck)
  );
}

export function remainingSetupChapters(
  home: HomeData,
  community: HomeCommunity | null,
  plan: PersonalPlan | null,
): SetupChapter[] {
  if (hasExistingSetupData(home)) return [];

  const chapters: SetupChapter[] = ["background"];
  const lovedOneCount =
    (home.lovedOnes?.length || 0) +
    (home.profile?.managedLovedOnes?.length || 0);

  if (!community && (home.groups?.length || 0) === 0) {
    chapters.push("group");
  }
  if (communityAllowsPersonalPrayer(community, plan) && lovedOneCount === 0) {
    chapters.push("lovedOne");
  }
  if (
    communityAllowsDailyPrayers(community, plan) &&
    !home.dailyDeck &&
    (lovedOneCount > 0 || chapters.includes("lovedOne"))
  ) {
    chapters.push("prayer");
  }
  return chapters;
}
