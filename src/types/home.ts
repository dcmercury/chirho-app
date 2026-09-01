export interface HomePrayerCard {
  prayeruuid?: string;
  deckuuid?: string;
  subjectType?: string;
  subjectId?: string;
  deckIndex?: number;
  title: string;
  verse: string;
  text: string;
  image: string;
  images?: string[];
  fullPrayer?: string;
  date?: string;
  narrationUrl?: string | null;
  backgroundMusicUrl?: string | null;
  backgroundMusicVolume?: number;
  audioAvailable?: boolean;
  audioStatus?: "not_started" | "pending" | "ready" | "failed";
}

export type PrayerFocusType =
  | "church"
  | "pet"
  | "country"
  | "health"
  | "situation"
  | "other";

export type PrayerFocusPeriod = "morning" | "evening" | "both";

export type PrayerFocusSpecies = "cat" | "dog" | "other";

export interface PrayerFocus {
  focusuuid: string;
  title: string;
  type: PrayerFocusType;
  species?: PrayerFocusSpecies | null;
  gender?: LovedOneGender | null;
  note?: string | null;
  categories: string[];
  virtues: string[];
  period: PrayerFocusPeriod;
  active: boolean;
  order: number;
  photos?: MediaPhoto[];
  /** Catalog still when there is no uploaded photo. */
  image?: string | null;
}

export type PrayerFocusInput = Omit<PrayerFocus, "focusuuid" | "photos" | "image">;

export interface DailyDeckSummary {
  deckuuid: string;
  localDate: string;
  timeOfDay: "morning" | "evening";
  status: "pending" | "ready" | "partial" | "failed";
  totalCards: number;
  readyCards: number;
  labels: string[];
}

export interface PrayerDeckItem {
  subjectType: string;
  subjectId: string;
  label: string;
  status: "pending" | "ready" | "failed";
  prayeruuid: string | null;
  error: string | null;
}

export interface PrayerDeckDetail extends DailyDeckSummary {
  items: PrayerDeckItem[];
}

export interface PrayerDeckCard extends HomePrayerCard {
  deckuuid: string;
  subjectType: string;
  subjectId: string;
  deckIndex: number;
}

export interface MediaPhoto {
  mediauuid: string;
  contentPath: string;
  isPrimary: boolean;
}

export type LovedOnePhoto = MediaPhoto;

export type LovedOneGender = "male" | "female";
export type LovedOneKind = "person" | "family";

export interface HomeLovedOne {
  id: string;
  name: string;
  avatar: string;
  intention: string;
  gender?: LovedOneGender;
  kind?: LovedOneKind;
  backgroundImage?: string;
  primaryPhoto?: LovedOnePhoto | null;
  photos?: LovedOnePhoto[];
  configurations?: Array<{ category: string; virtues: string[] }>;
}

export interface HomeGroup {
  groupuuid: string;
  name: string;
  members: number;
  image: string;
  lastActivity?: string;
  hasNotification?: boolean;
  newPrayers?: number;
  prayerCount?: number;
}

export interface ProfileOption {
  id: string;
  label: string;
}

export type PrayerLength = "short" | "medium" | "long";

export interface DailyPrayerSettings {
  enabled: boolean;
  hour: string;
  minutes: string;
  timezone: string;
  textOnly: boolean;
}

export interface HomeProfile {
  isSuperadmin: boolean;
  name: string;
  avatar: string;
  memberSince: string;
  stats: { value: string; label: string }[];
  account: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    gender?: LovedOneGender;
  };
  traditions: {
    selected: string;
    options: ProfileOption[];
    locked?: boolean;
  };
  prayerLength: PrayerLength;
  voices: {
    selected: string;
    options: (ProfileOption & { description?: string; accent?: string })[];
  };
  dailyPrayers: {
    morning: DailyPrayerSettings;
    evening: DailyPrayerSettings;
  };
  notifications: {
    label: string;
    key: string;
    enabled: boolean;
    adminDisabled?: boolean;
  }[];
  privacy: { label: string; key: string; enabled: boolean; adminDisabled?: boolean }[];
  managedLovedOnes: {
    id: string;
    firstName: string;
    gender?: LovedOneGender;
    kind?: LovedOneKind;
    hasConfig: boolean;
    categories: string[];
    configurations?: Array<{ category: string; virtues: string[] }>;
  }[];
  appSettings: {
    theme: string;
    fontSize: string;
  };
  backgroundMusicEnabled?: boolean;
  backgroundMusicId?: string | null;
  dashboardBackground?: string | null;
  dashboardBackgrounds?: string[];
}

export interface HomeData {
  profile: HomeProfile;
  cards: HomePrayerCard[];
  lovedOnes: HomeLovedOne[];
  prayerFocuses: PrayerFocus[];
  dailyDeck: DailyDeckSummary | null;
  groups: HomeGroup[];
  availableGroups: HomeGroup[];
}

export interface HomeCommunity {
  communityuuid: string;
  name: string;
  location?: string;
  tradition?: string | null;
  logo?: string | null;
  backgroundImage?: string | null;
  donationLink?: string | null;
  features?: {
    membersCanCreateGroups: boolean;
    membersCanInvite: boolean;
    groupMessages: boolean;
    groupPrayerRequests: boolean;
    lockTradition: boolean;
    notifyGroupInvites: boolean;
    notifyGroupPrayers: boolean;
    notifyGroupAnnouncements: boolean;
    notifyGroupMemberActivity: boolean;
    showDonation: boolean;
    sharePrayersWithGroups: boolean;
    dailyPrayers: boolean;
    personalPrayer: boolean;
  };
  licenseTier?: string | null;
  canCreateGroups?: boolean;
  createBlockedReason?: "members" | "community_limit" | "user_limit" | null;
  groupLimits?: {
    maxGroups: number | null;
    maxGroupsPerUser: number | null;
  };
  groupsUsed?: number;
}

export interface PendingGroupInvite {
  invitationToken: string;
  groupuuid: string;
  groupName: string;
  groupImage?: string | null;
  firstName?: string | null;
  phoneLastFour?: string | null;
  expiresAt: string;
}

export interface MobileHomeResponse {
  home: HomeData;
  community: HomeCommunity | null;
  plan: PersonalPlan | null;
  pendingInvites: PendingGroupInvite[];
}

export type PersonalPlanStatus = "free" | "trial" | "pro" | "sponsored";

export interface PersonalPlan {
  status: PersonalPlanStatus;
  source: string;
  hasPersonalPro: boolean;
  canStartTrial: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  paidAt: string | null;
  sponsoredByCommunityuuid: string | null;
  sponsoredByName: string | null;
  daysLeft: number | null;
  priceLabel: string;
  billingEnabled: boolean;
  complimentaryAccess: boolean;
}

export function communityAllowsPersonalPrayer(
  community: HomeCommunity | null | undefined,
  plan?: PersonalPlan | null,
): boolean {
  if (!community) return true;
  if (plan?.hasPersonalPro) return true;
  return community.features?.personalPrayer === true;
}

export function communityAllowsDailyPrayers(
  community: HomeCommunity | null | undefined,
  plan?: PersonalPlan | null,
): boolean {
  if (!community) return true;
  if (plan?.hasPersonalPro) return true;
  return community.features?.dailyPrayers === true;
}

export function formatTrialRemaining(trialEndsAt: string | null | undefined) {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}d ${hours}h left in your free week`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m left in your free week`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s left in your free week`;
  }
  return `${seconds}s left in your free week`;
}

export interface GroupDetail {
  groupuuid: string;
  name: string;
  description?: string;
  memberCount?: number;
  members?: unknown[];
  image?: string;
  backgroundImage?: string;
  purpose?: string;
}
