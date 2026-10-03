import type { WebViewNavigation } from "react-native-webview";
import { API_BASE } from "../../lib/assets";
import { openExternalUrl } from "../../lib/openExternalUrl";
import type { ChurchMessage } from "../../types/home";

export const VIDEO_ID = /^[\w-]{11}$/;

export function embedHtml(videoId: string): string {
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&controls=1&rel=0&modestbranding=1&iv_load_policy=3`;
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe src="${src}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`;
}

export function stillFor(message: ChurchMessage): string | null {
  return VIDEO_ID.test(message.videoId)
    ? `https://i.ytimg.com/vi/${message.videoId}/hqdefault.jpg`
    : message.thumbnail;
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds < 60) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours} hr ${minutes} min` : `${minutes} min`;
}

export function allowEmbedNavigation(
  request: WebViewNavigation & { isTopFrame?: boolean },
) {
  if (request.isTopFrame === false) return true;
  if (request.url === "about:blank" || request.url.startsWith(API_BASE)) {
    return true;
  }
  void openExternalUrl(request.url);
  return false;
}
