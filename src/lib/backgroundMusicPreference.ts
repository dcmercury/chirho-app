let enabled = true;
let url: string | null = null;
const listeners = new Set<(value: boolean) => void>();
const urlListeners = new Set<(value: string | null) => void>();

export function getBackgroundMusicEnabled() {
  return enabled;
}

export function getBackgroundMusicUrl() {
  return url;
}

export function setBackgroundMusicEnabled(value: boolean) {
  if (enabled === value) return;
  enabled = value;
  listeners.forEach((listener) => listener(value));
}

export function setBackgroundMusicUrl(value: string | null) {
  if (url === value) return;
  url = value;
  urlListeners.forEach((listener) => listener(value));
}

export function subscribeBackgroundMusicEnabled(
  listener: (value: boolean) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeBackgroundMusicUrl(
  listener: (value: string | null) => void,
) {
  urlListeners.add(listener);
  return () => {
    urlListeners.delete(listener);
  };
}
