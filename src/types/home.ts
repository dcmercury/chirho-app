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
  | "health"
  | "situation"
  | "other";

export type PrayerFocusPeriod = "morning" | "evening" | "both";

export interface PrayerFocus {
  focusuuid: string;
  title: string;
  type: PrayerFocusType;
  note?: string | null;
  categories: string[];
  virtues: string[];
  period: PrayerFocusPeriod;
  active: boolean;
  order: number;
}

export type PrayerFocusInput = Omit<PrayerFocus, "focusuuid">;

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

export interface LovedOnePhoto {
  mediauuid: string;
  contentPath: string;
  isPrimary: boolean;
}

export interface HomeLovedOne {
  id: string;
  name: string;
  avatar: string;
  intention: string;
  backgroundImage?: string;
  primaryPhoto?: LovedOnePhoto | null;
  photos?: LovedOnePhoto[];
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
  };
  traditions: {
    selected: string;
    options: ProfileOption[];
    locked?: boolean;
  };
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
    hasConfig: boolean;
    categories: string[];
  }[];
  appSettings: {
    theme: string;
    fontSize: string;
  };
  backgroundMusicEnabled?: boolean;
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

export interface MobileHomeResponse {
  home: HomeData;
  community: HomeCommunity | null;
}

export function communityAllowsPersonalPrayer(
  community: HomeCommunity | null | undefined,
): boolean {
  if (!community) return true;
  return community.features?.personalPrayer === true;
}

export function communityAllowsDailyPrayers(
  community: HomeCommunity | null | undefined,
): boolean {
  if (!community) return true;
  return community.features?.dailyPrayers === true;
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
