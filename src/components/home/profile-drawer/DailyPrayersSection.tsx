import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  DailyPrayerSettings,
  HomeProfile,
} from "../../../types/home";
import { fonts, type ColorTokens } from "../../../theme/tokens";
import { useThemedStyles } from "../../../theme/ThemeProvider";
import {
  InlineError,
  Section,
  ToggleRow,
  useProfileStyles,
} from "./ProfileControls";
import type { DailyPrayerPeriod } from "./profileUtilities";

function formatReadyBy(hour: string, minutes: string, suffix: string, timezone: string) {
  return `${hour}:${minutes.padStart(2, "0")} ${suffix} · ${timezone}`;
}

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
  const hourStyles = useThemedStyles(createHourStyles);
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
                <View style={hourStyles.picker}>
                  <Text style={hourStyles.selected}>
                    {formatReadyBy(
                      value.hour,
                      value.minutes,
                      suffix,
                      value.timezone,
                    )}
                  </Text>
                  <Text style={hourStyles.hint}>
                    Ready by this hour. Notify if Daily Prayer Reminders is on.
                  </Text>
                  <View style={hourStyles.grid}>
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(
                      (hour) => {
                        const selected =
                          String(hour) === String(Number(value.hour));
                        return (
                          <View key={`${period}-${hour}`} style={hourStyles.cell}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`${hour} ${suffix}`}
                              accessibilityState={{ selected, disabled: pending }}
                              disabled={pending}
                              onPress={() =>
                                onChange(period, {
                                  ...value,
                                  hour: String(hour),
                                })
                              }
                              style={[
                                hourStyles.pill,
                                selected && hourStyles.pillActive,
                                pending && hourStyles.disabled,
                              ]}
                            >
                              <Text
                                style={[
                                  hourStyles.pillText,
                                  selected && hourStyles.pillTextActive,
                                ]}
                              >
                                {hour} {suffix}
                              </Text>
                            </Pressable>
                          </View>
                        );
                      },
                    )}
                  </View>
                </View>
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

function createHourStyles(colors: ColorTokens) {
  return StyleSheet.create({
    picker: {
      paddingTop: 14,
      paddingBottom: 16,
    },
    selected: {
      color: colors.title,
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 0.4,
    },
    hint: {
      color: colors.muted,
      fontFamily: fonts.mono,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 6,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -4,
      marginTop: 14,
    },
    cell: {
      width: "25%",
      padding: 4,
    },
    pill: {
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    pillActive: {
      backgroundColor: colors.accentFillPill,
      borderColor: colors.accentBorderPill,
    },
    pillText: {
      color: colors.mutedSoft,
      fontFamily: fonts.mono,
      fontSize: 10,
    },
    pillTextActive: { color: colors.accentText },
    disabled: { opacity: 0.35 },
  });
}
