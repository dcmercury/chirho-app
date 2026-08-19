import type { DailyPrayerSettings, HomeProfile } from "../../../types/home";

export type DailyPrayerPeriod = "morning" | "evening";

export interface SerializedDailyPrayer {
  enabled: boolean;
  time: string | null;
  timezone: string | null;
  textOnly: boolean;
  prayeruuid: null;
}

export interface DailyPrayerPayload {
  morning: SerializedDailyPrayer;
  evening: SerializedDailyPrayer;
}

const voiceIds: Record<string, string> = {
  "american-priest": "MCkmNHsdG826UovZqqSA",
  "british-priest": "RsgZlqabeFOyHtTfpERU",
  george: "JBFqnCBsd6RMkjVDRZzb",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  bill: "pqHfZKP75CvOlQylNhV4",
  james: "ZQe5CZNOzWyzPSCn5a3c",
  nicole: "piTKgcLEGmPE4e6mEKli",
  josh: "TxGEqnHWrfWFTfGW9XjX",
  michael: "flq6f7yk4E4fJM5XTYuZ",
  charlotte: "XB0fDUnXU5powFXDhCwa",
};

export function resolveVoiceId(voice: string): string {
  return voiceIds[voice] || voice;
}

function serializeDailyPrayer(
  value: DailyPrayerSettings,
  suffix: "AM" | "PM",
): SerializedDailyPrayer {
  return {
    enabled: value.enabled,
    time: value.enabled
      ? `${value.hour}:${value.minutes.padStart(2, "0")}${suffix}`
      : null,
    timezone: value.enabled ? value.timezone : null,
    textOnly: value.textOnly,
    prayeruuid: null,
  };
}

export function serializeDailyPrayerPayload(
  dailyPrayers: HomeProfile["dailyPrayers"],
  period: DailyPrayerPeriod,
  next: DailyPrayerSettings,
): DailyPrayerPayload {
  return {
    morning: serializeDailyPrayer(
      period === "morning" ? next : dailyPrayers.morning,
      "AM",
    ),
    evening: serializeDailyPrayer(
      period === "evening" ? next : dailyPrayers.evening,
      "PM",
    ),
  };
}
