let enabled = true;
const listeners = new Set<(value: boolean) => void>();

export function getBackgroundMusicEnabled() {
  return enabled;
}

export function setBackgroundMusicEnabled(value: boolean) {
  if (enabled === value) return;
  enabled = value;
  listeners.forEach((listener) => listener(value));
}

export function subscribeBackgroundMusicEnabled(
  listener: (value: boolean) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
