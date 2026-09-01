/**
 * Admin-managed background library.
 *
 * The art people choose from is no longer bundled with the app; it comes from
 * GET /api/backgrounds so it can be curated without an App Store release. A
 * module-level cache keeps every screen on the same list within a session, and
 * a small slice is persisted so the picker still has something to show offline.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/expo";
import { Image } from "expo-image";
import * as SecureStore from "expo-secure-store";
import { API_BASE, DEFAULT_BACKGROUND, resolveImageUri } from "./assets";

export interface LibraryBackground {
  backgrounduuid: string;
  title: string;
  url: string;
  width: number;
  height: number;
}

const CACHE_KEY = "chirho.backgroundLibrary";
// SecureStore is built for small values, so only the head of the library is
// persisted; the rest arrives with the next successful fetch.
const CACHE_LIMIT = 10;
const PREFETCH_COUNT = 4;
const STALE_AFTER_MS = 5 * 60 * 1000;

let cache: LibraryBackground[] = [];
let fetchedAt = 0;
let inflight: Promise<LibraryBackground[]> | null = null;
const listeners = new Set<(items: LibraryBackground[]) => void>();

/** Last known library, for callers that cannot await. */
export function cachedBackgrounds(): LibraryBackground[] {
  return cache;
}

export function cachedBackgroundUrls(): string[] {
  return cache.map((item) => item.url);
}

/** Library items are selected by uuid so the server can copy them. */
export function backgroundIdForUrl(url: string): string | null {
  return (
    cache.find((item) => item.url === url)?.backgrounduuid ?? null
  );
}

function publish(items: LibraryBackground[]) {
  cache = items;
  for (const listener of listeners) listener(items);
}

async function persist(items: LibraryBackground[]) {
  try {
    await SecureStore.setItemAsync(
      CACHE_KEY,
      JSON.stringify(items.slice(0, CACHE_LIMIT)),
    );
  } catch {
    // A full or unavailable keychain only costs us the offline copy.
  }
}

async function restore(): Promise<LibraryBackground[]> {
  try {
    const raw = await SecureStore.getItemAsync(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadBackgroundLibrary(
  token?: string | null,
  options: { force?: boolean } = {},
): Promise<LibraryBackground[]> {
  const fresh = Date.now() - fetchedAt < STALE_AFTER_MS;
  if (!options.force && cache.length && fresh) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/backgrounds`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new Error(`Library request failed: ${response.status}`);
      const data = (await response.json()) as { backgrounds?: LibraryBackground[] };
      const backgrounds = (data.backgrounds || []).filter((item) => item?.url);
      if (backgrounds.length) {
        fetchedAt = Date.now();
        publish(backgrounds);
        void persist(backgrounds);
        // Prefetch the URLs the image components will request, proxy included,
        // so the warmed cache entries are the ones they look up.
        void Image.prefetch(
          backgrounds
            .slice(0, PREFETCH_COUNT)
            .map((item) => resolveImageUri(item.url))
            .filter((uri): uri is string => Boolean(uri)),
        );
      }
      return backgrounds;
    } catch {
      // Offline or a bad deploy should still leave the picker usable.
      if (!cache.length) publish(await restore());
      return cache;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Library for the signed-in user, including their community's art. Falls back
 * to the bundled default so a screen never renders an empty gallery.
 */
export function useBackgroundLibrary(): {
  backgrounds: LibraryBackground[];
  urls: string[];
  loading: boolean;
} {
  const { getToken } = useAuth();
  const [backgrounds, setBackgrounds] = useState<LibraryBackground[]>(cache);
  const [loading, setLoading] = useState(!cache.length);

  useEffect(() => {
    let active = true;
    const listener = (items: LibraryBackground[]) => {
      if (active) setBackgrounds(items);
    };
    listeners.add(listener);

    void (async () => {
      const token = await getToken().catch(() => null);
      await loadBackgroundLibrary(token);
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, [getToken]);

  const urls = backgrounds.map((item) => item.url);
  return {
    backgrounds,
    urls: urls.length ? urls : [DEFAULT_BACKGROUND],
    loading,
  };
}
