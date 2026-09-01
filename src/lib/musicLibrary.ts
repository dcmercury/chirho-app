/**
 * Admin-managed background music library.
 *
 * Tracks come from GET /api/music so the Sound picker can change without an
 * App Store release. Until an admin uploads, the server returns the bundled
 * prayercards folder.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/expo";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "./assets";

export interface LibraryMusicTrack {
  musicuuid: string;
  title: string;
  url: string;
}

const CACHE_KEY = "chirho.musicLibrary";
const STALE_AFTER_MS = 5 * 60 * 1000;

let cache: LibraryMusicTrack[] = [];
let fetchedAt = 0;
let inflight: Promise<LibraryMusicTrack[]> | null = null;
const listeners = new Set<(items: LibraryMusicTrack[]) => void>();

export function cachedMusic(): LibraryMusicTrack[] {
  return cache;
}

function publish(items: LibraryMusicTrack[]) {
  cache = items;
  for (const listener of listeners) listener(items);
}

async function persist(items: LibraryMusicTrack[]) {
  try {
    await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(items));
  } catch {
    // Offline copy is best-effort.
  }
}

async function restore(): Promise<LibraryMusicTrack[]> {
  try {
    const raw = await SecureStore.getItemAsync(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadMusicLibrary(
  token?: string | null,
  options: { force?: boolean } = {},
): Promise<LibraryMusicTrack[]> {
  const fresh = Date.now() - fetchedAt < STALE_AFTER_MS;
  if (!options.force && cache.length && fresh) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/music`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new Error(`Library request failed: ${response.status}`);
      const data = (await response.json()) as { tracks?: LibraryMusicTrack[] };
      const tracks = (data.tracks || []).filter((item) => item?.url);
      if (tracks.length) {
        fetchedAt = Date.now();
        publish(tracks);
        void persist(tracks);
      }
      return tracks;
    } catch {
      if (!cache.length) publish(await restore());
      return cache;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function useMusicLibrary(): {
  tracks: LibraryMusicTrack[];
  loading: boolean;
} {
  const { getToken } = useAuth();
  const [tracks, setTracks] = useState<LibraryMusicTrack[]>(cache);
  const [loading, setLoading] = useState(!cache.length);

  useEffect(() => {
    let active = true;
    const listener = (items: LibraryMusicTrack[]) => {
      if (active) setTracks(items);
    };
    listeners.add(listener);

    void (async () => {
      const token = await getToken().catch(() => null);
      await loadMusicLibrary(token);
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, [getToken]);

  return { tracks, loading };
}

export function resolveLibraryMusicUrl(
  musicuuid: string | null | undefined,
  tracks: LibraryMusicTrack[],
): string | null {
  if (musicuuid) {
    const match = tracks.find((track) => track.musicuuid === musicuuid);
    if (match) return match.url;
  }
  return tracks[0]?.url || null;
}
