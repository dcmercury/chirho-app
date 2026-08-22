import type { ImageSource } from "expo-image";

// Stock art now comes from the admin-managed library over the network, so only
// the default backdrop stays bundled for offline first paint.
export const images = {
  intro: require("../../assets/onboarding/intro.png") as ImageSource,
  avatar1: require("../../assets/onboarding/avatar1.png") as ImageSource,
  avatar2: require("../../assets/onboarding/avatar2.png") as ImageSource,
  avatar3: require("../../assets/onboarding/avatar3.png") as ImageSource,
};

export const DEFAULT_BACKGROUND = "/intro.png";

/** Shown when a prayer or group record carries no image of its own. */
export const FALLBACK_PRAYER_IMAGE = "/prayercards/backgrounds/church.jpg";

export const video = {
  intro: require("../../assets/onboarding/intro.mp4"),
};

const PATH_MAP: Record<string, ImageSource> = {
  "/intro.png": images.intro,
  "/avatar1.png": images.avatar1,
  "/avatar2.png": images.avatar2,
  "/avatar3.png": images.avatar3,
};

export function isPrivateImagePath(path: string | undefined | null): boolean {
  return Boolean(
    path &&
    (/\/api\/user\/profile\/loved-ones\/[^/]+\/photos\/[^/?#]+/.test(path) ||
      /\/api\/user\/prayer-focuses\/[^/]+\/photos\/[^/?#]+/.test(path)),
  );
}

export function privateImageCachePolicy(path?: string | null) {
  return isPrivateImagePath(path) ? "memory-disk" : undefined;
}

export function resolveImage(
  path: string | undefined | null,
  token?: string | null,
): ImageSource {
  if (!path) return images.intro;
  const headers =
    token && isPrivateImagePath(path)
      ? { Authorization: `Bearer ${token}` }
      : undefined;
  if (/^https?:\/\//.test(path)) {
    if (path.includes("dailyoffice-assets.s3")) {
      return {
        uri: `${API_BASE}/api/image-proxy?url=${encodeURIComponent(path)}`,
      };
    }
    return headers ? { uri: path, headers } : { uri: path };
  }
  if (PATH_MAP[path]) return PATH_MAP[path];
  if (path.startsWith("/")) {
    const uri = `${API_BASE}${path}`;
    return headers ? { uri, headers } : { uri };
  }
  return images.intro;
}

/**
 * The URL an image component will actually request, including the S3 proxy.
 * For callers that need a plain string rather than an `ImageSource`.
 */
export function resolveImageUri(
  path: string | undefined | null,
): string | null {
  const source = resolveImage(path);
  if (source && typeof source === "object" && "uri" in source) {
    return source.uri ?? null;
  }
  return null;
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
  "/audio/prayercards/Pater_Noster_1min-30.mp3";

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "https://www.chirho.ai";
