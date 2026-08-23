import { useState } from "react";
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

function formatTime(hour: string, minutes: string, suffix: string) {
  return `${hour}:${minutes.padStart(2, "0")} ${suffix}`;
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
  const [expandedPeriod, setExpandedPeriod] =
    useState<DailyPrayerPeriod | null>(null);

  return (
    <Section title="Daily prayers">
      <Pressable
        accessibilityLabel="Choose who to include in daily prayers"
        accessibilityRole="button"
        onPress={onOpenWizard}
        style={styles.manageRow}
      >
        <View style={styles.manageCopy}>
          <Text style={styles.manageName}>Choose who to pray for</Text>
          <Text style={styles.manageMeta}>
            Select loved ones for morning and evening prayers.
          </Text>
        </View>
        <View style={[styles.accountCaret, styles.caretForward]} />
      </Pressable>
      {(["morning", "evening"] as const).map((period) => {
        const value = dailyPrayers[period];
        const pending = isPending(period);
        const suffix = period === "morning" ? "AM" : "PM";
        const expanded = expandedPeriod === period;
        return (
          <View key={period} style={hourStyles.period}>
            <ToggleRow
              disabled={pending}
              label={`${period[0].toUpperCase()}${period.slice(1)} prayer`}
              onValueChange={(enabled) => {
                onChange(period, { ...value, enabled });
                setExpandedPeriod(enabled ? period : null);
              }}
              value={value.enabled}
            />
            {value.enabled ? (
              <>
                <Pressable
                  accessibilityLabel={`${expanded ? "Hide" : "Edit"} ${period} prayer schedule`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() =>
                    setExpandedPeriod(expanded ? null : period)
                  }
                  style={({ pressed }) => [
                    hourStyles.schedule,
                    pressed && hourStyles.pressed,
                  ]}
                >
                  <View>
                    <Text style={hourStyles.scheduleLabel}>Ready at</Text>
                    <Text style={hourStyles.scheduleValue}>
                      {formatTime(value.hour, value.minutes, suffix)}
                      {" · "}
                      {value.textOnly ? "Text only" : "Text + app link"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.accountCaret,
                      expanded && styles.accountCaretExpanded,
                    ]}
                  />
                </Pressable>
                {expanded ? (
                  <View style={hourStyles.picker}>
                    <Text style={hourStyles.pickerTitle}>Choose a time</Text>
                    <Text style={hourStyles.hint}>
                      Saving a time uses your device’s current time zone.
                    </Text>
                    <View style={hourStyles.grid}>
                      {Array.from({ length: 12 }, (_, index) => index + 1).map(
                        (hour) => {
                          const selected =
                            String(hour) === String(Number(value.hour));
                          return (
                            <View
                              key={`${period}-${hour}`}
                              style={hourStyles.cell}
                            >
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`${hour} ${suffix}`}
                                accessibilityState={{
                                  selected,
                                  disabled: pending,
                                }}
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
                    <ToggleRow
                      disabled={pending}
                      label="Include app link"
                      onValueChange={(includeAppLink) =>
                        onChange(period, {
                          ...value,
                          textOnly: !includeAppLink,
                        })
                      }
                      value={!value.textOnly}
                    />
                    <Text style={hourStyles.hint}>
                      Adds a link to listen in ChiRho. Turn off for prayer text
                      only.
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
            <InlineError message={getError(period)} />
          </View>
        );
      })}
    </Section>
  );
}

function createHourStyles(colors: ColorTokens) {
  return StyleSheet.create({
    reminder: {
      marginBottom: 4,
    },
    period: {
      marginBottom: 6,
    },
    schedule: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorderSoft,
    },
    scheduleLabel: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 10,
    },
    scheduleValue: {
      color: colors.title,
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      letterSpacing: 0.3,
      marginTop: 3,
    },
    pressed: {
      opacity: 0.68,
    },
    picker: {
      paddingTop: 16,
      paddingBottom: 10,
    },
    pickerTitle: {
      color: colors.title,
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
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
