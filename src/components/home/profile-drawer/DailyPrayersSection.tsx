import { Pressable, Text, View } from "react-native";
import type {
  DailyPrayerSettings,
  HomeProfile,
} from "../../../types/home";
import {
  InlineError,
  Section,
  ToggleRow,
  useProfileStyles,
} from "./ProfileControls";
import type { DailyPrayerPeriod } from "./profileUtilities";

export function DailyPrayersSection({
  dailyPrayers,
  isPending,
  getError,
  onChange,
  onOpenWizard,
}: {
  dailyPrayers: HomeProfile["dailyPrayers"];
  isPending: (period: DailyPrayerPeriod) => boolean;
  getError: (period: DailyPrayerPeriod) => string | undefined;
  onChange: (
    period: DailyPrayerPeriod,
    next: DailyPrayerSettings,
  ) => void;
  onOpenWizard: () => void;
}) {
  const styles = useProfileStyles();
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
      <Pressable
        accessibilityLabel="Create morning and evening prayer"
        accessibilityRole="button"
        onPress={onOpenWizard}
        style={styles.manageRow}
      >
        <View style={styles.manageCopy}>
          <Text style={styles.manageName}>Create morning & evening prayer</Text>
          <Text style={styles.manageMeta}>
            Choose loved ones and let AI write the prayer.
          </Text>
        </View>
        <View style={[styles.accountCaret, styles.caretForward]} />
      </Pressable>
    </Section>
  );
}
