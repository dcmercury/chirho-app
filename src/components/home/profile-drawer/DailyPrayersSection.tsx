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
        const suffix = period === "morning" ? "AM" : "PM";
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
            {value.enabled ? (
              <>
                <ToggleRow
                  disabled={pending}
                  label="Text only"
                  onValueChange={(textOnly) =>
                    onChange(period, { ...value, textOnly })
                  }
                  value={value.textOnly}
                />
                <Text style={styles.settingMeta}>
                  Ready by this hour. Notify if Daily Prayer Reminders is on.
                </Text>
                <View style={styles.pills}>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(
                    (hour) => {
                      const selected = String(hour) === String(Number(value.hour));
                      return (
                        <Pressable
                          key={`${period}-${hour}`}
                          accessibilityRole="button"
                          accessibilityLabel={`${hour} ${suffix}`}
                          disabled={pending}
                          onPress={() =>
                            onChange(period, { ...value, hour: String(hour) })
                          }
                          style={[styles.pill, selected && styles.pillActive]}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              selected && styles.pillTextActive,
                            ]}
                          >
                            {hour}
                            {suffix}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </View>
                <Text style={styles.settingMeta}>
                  {value.hour}:{value.minutes.padStart(2, "0")}
                  {suffix} · {value.timezone}
                </Text>
              </>
            ) : null}
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
