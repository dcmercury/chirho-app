import { Text, View } from "react-native";
import type {
  DailyPrayerSettings,
  HomeProfile,
} from "../../../types/home";
import {
  InlineError,
  Section,
  ToggleRow,
  styles,
} from "./ProfileControls";
import type { DailyPrayerPeriod } from "./profileUtilities";

export function DailyPrayersSection({
  dailyPrayers,
  isPending,
  getError,
  onChange,
}: {
  dailyPrayers: HomeProfile["dailyPrayers"];
  isPending: (period: DailyPrayerPeriod) => boolean;
  getError: (period: DailyPrayerPeriod) => string | undefined;
  onChange: (
    period: DailyPrayerPeriod,
    next: DailyPrayerSettings,
  ) => void;
}) {
  return (
    <Section title="Daily prayers">
      {(["morning", "evening"] as const).map((period) => {
        const value = dailyPrayers[period];
        const pending = isPending(period);
        return (
          <View key={period} style={styles.settingGroup}>
            <ToggleRow
              disabled={pending}
              label={`${period[0].toUpperCase()}${period.slice(1)} prayer`}
              onValueChange={(enabled) =>
                onChange(period, { ...value, enabled })
              }
              value={value.enabled}
            />
            <ToggleRow
              disabled={pending || !value.enabled}
              label="Text only"
              onValueChange={(textOnly) =>
                onChange(period, { ...value, textOnly })
              }
              value={value.textOnly}
            />
            <Text style={styles.settingMeta}>
              {value.hour}:{value.minutes.padStart(2, "0")} · {value.timezone}
            </Text>
            <InlineError message={getError(period)} />
          </View>
        );
      })}
    </Section>
  );
}
