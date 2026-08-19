import type { ImageSource } from "expo-image";

export const images = {
  intro: require("../../assets/onboarding/intro.png") as ImageSource,
  cover1: require("../../assets/onboarding/cover1.jpg") as ImageSource,
  cover2: require("../../assets/onboarding/cover2.jpg") as ImageSource,
  cover3: require("../../assets/onboarding/cover3.jpg") as ImageSource,
  cover4: require("../../assets/onboarding/cover4.jpg") as ImageSource,
  cover5: require("../../assets/onboarding/cover5.jpg") as ImageSource,
  cover6: require("../../assets/onboarding/cover6.jpg") as ImageSource,
  avatar1: require("../../assets/onboarding/avatar1.png") as ImageSource,
  avatar2: require("../../assets/onboarding/avatar2.png") as ImageSource,
  avatar3: require("../../assets/onboarding/avatar3.png") as ImageSource,
};

export const video = {
  intro: require("../../assets/onboarding/intro.mp4"),
};

const PATH_MAP: Record<string, ImageSource> = {
  "/intro.png": images.intro,
  "/cover1.jpg": images.cover1,
  "/cover2.jpg": images.cover2,
  "/cover3.jpg": images.cover3,
  "/cover4.jpg": images.cover4,
  "/cover5.jpg": images.cover5,
  "/cover6.jpg": images.cover6,
  "/avatar1.png": images.avatar1,
  "/avatar2.png": images.avatar2,
  "/avatar3.png": images.avatar3,
};

export function resolveImage(path: string | undefined | null): ImageSource {
  if (!path) return images.intro;
  if (/^https?:\/\//.test(path)) {
    if (path.includes("dailyoffice-assets.s3")) {
      return {
        uri: `${API_BASE}/api/image-proxy?url=${encodeURIComponent(path)}`,
      };
    }
    return { uri: path };
  }
  if (PATH_MAP[path]) return PATH_MAP[path];
  if (path.startsWith("/")) return { uri: `${API_BASE}${path}` };
  return images.intro;
}

export function resolveAudioUrl(path: string | undefined | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) {
    if (path.includes("dailyoffice-assets.s3")) {
      return `${API_BASE}/api/audio-proxy?url=${encodeURIComponent(path)}`;
    }
    return path;
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export const DEFAULT_BACKGROUND_MUSIC =
  "/audio/background-music/ambient-morning.mp3";

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "https://www.chirho.ai";
