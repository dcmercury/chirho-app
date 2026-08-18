export interface PrayerCard {
  title: string;
  verse: string;
  text: string;
  image: string;
  date?: string;
}

export interface LovedOne {
  name: string;
  avatar: string;
  intention: string;
}

export interface PrayerGroup {
  name: string;
  members: number;
  image: string;
}

export interface WelcomeStep {
  type: "info" | "signin";
  title: string;
  subtitle: string;
  description: string;
  backgroundImage: string;
  video: string | null;
  footerLabel: string;
  overlayOpacity: number;
  cards?: PrayerCard[];
  lovedOnes?: LovedOne[];
  groups?: PrayerGroup[];
  logo?: string;
}
