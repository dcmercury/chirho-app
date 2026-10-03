import * as SecureStore from "expo-secure-store";

/**
 * API.Bible fair-use reporting for native apps:
 * https://docs.api.bible/guides/fair-use#how-to-report-fums-manually
 * Device and session ids are random and carry no personal data.
 */

const DEVICE_KEY = "chirho.fumsDeviceId";
const SESSION_ID = randomId();
let deviceId: Promise<string> | null = null;

function randomId(): string {
  let id = "";
  while (id.length < 21) id += Math.random().toString(36).slice(2);
  return id.slice(0, 21);
}

function getDeviceId(): Promise<string> {
  deviceId ??= (async () => {
    try {
      const saved = await SecureStore.getItemAsync(DEVICE_KEY);
      if (saved) return saved;
      const created = randomId();
      await SecureStore.setItemAsync(DEVICE_KEY, created);
      return created;
    } catch {
      return randomId();
    }
  })();
  return deviceId;
}

export async function reportScriptureView(fums: {
  token: string;
  userId: string;
}): Promise<void> {
  try {
    const params = new URLSearchParams({
      t: fums.token,
      dId: await getDeviceId(),
      sId: SESSION_ID,
      uId: fums.userId,
    });
    await fetch(`https://fums.api.bible/f3?${params.toString()}`);
  } catch {
    // Reporting is best effort and must never block reading.
  }
}
