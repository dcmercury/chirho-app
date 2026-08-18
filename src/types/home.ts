export interface HomePrayerCard {
  prayeruuid?: string;
  title: string;
  verse: string;
  text: string;
  image: string;
  fullPrayer?: string;
  date?: string;
}

export interface HomeLovedOne {
  id: string;
  name: string;
  avatar: string;
  intention: string;
  backgroundImage?: string;
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
  privacy: { label: string; key: string; enabled: boolean }[];
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
}

export interface HomeData {
  profile: HomeProfile;
  cards: HomePrayerCard[];
  lovedOnes: HomeLovedOne[];
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
}

export interface MobileHomeResponse {
  home: HomeData;
  community: HomeCommunity | null;
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
