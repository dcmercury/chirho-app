import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
} from "react-native";
import { colors, fonts } from "../../../theme/tokens";
import type { PrayerIntensity } from "../types";
import { SparkleIcon } from "./Icons";

const CATEGORIES = [
  ["Family", "◯"],
  ["Work", "◇"],
  ["Health", "♡"],
  ["School", "△"],
  ["Relationships", "□"],
  ["Finances", "$"],
] as const;

interface PrayerRequestFormProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: (intensities: PrayerIntensity[]) => Promise<void>;
  onSubmit: (intensities: PrayerIntensity[]) => Promise<void>;
  onCancel: () => void;
  generating: boolean;
  sending: boolean;
}

export function PrayerRequestForm({
  value,
  onChange,
  onGenerate,
  onSubmit,
  onCancel,
  generating,
  sending,
}: PrayerRequestFormProps) {
  const [step, setStep] = useState<0 | 1>(0);
  const [intensities, setIntensities] = useState<Record<string, number>>(
    Object.fromEntries(CATEGORIES.map(([name]) => [name, 0])),
  );

  const selected = Object.entries(intensities)
    .filter(([, intensity]) => intensity > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, intensity]) => ({ category, intensity }));

  if (step === 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>What&apos;s on your heart?</Text>
        <Text style={styles.subtitle}>
          Tap to set intensity (0–10) for each area needing prayer.
        </Text>
        <View style={styles.sliderList}>
          {CATEGORIES.map(([category, icon]) => (
            <IntensitySlider
              key={category}
              category={category}
              icon={icon}
              value={intensities[category]}
              onChange={(intensity) =>
                setIntensities((current) => ({
                  ...current,
                  [category]: intensity,
                }))
              }
            />
          ))}
        </View>
        <View style={styles.actions}>
          <SecondaryButton label="Cancel" onPress={onCancel} />
          <PrimaryButton label="Continue" onPress={() => setStep(1)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.title}>Share a prayer request</Text>
        <Pressable
          disabled={generating}
          onPress={() => onGenerate(selected)}
          style={({ pressed }) => [
            styles.generate,
            pressed && styles.pressed,
            generating && styles.disabled,
          ]}
        >
          <SparkleIcon color={colors.mutedSoft} size={12} />
          <Text style={styles.generateText}>
            {generating ? "Writing..." : "Write for me"}
          </Text>
        </Pressable>
      </View>
      {selected.length > 0 ? (
        <View style={styles.pills}>
          {selected.map(({ category, intensity }) => (
            <View key={category} style={styles.pill}>
              <Text style={styles.pillText}>{category}</Text>
              <Text style={styles.pillValue}>{intensity}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <TextInput
        autoFocus
        multiline
        editable={!sending}
        placeholder="What would you like prayer for?"
        placeholderTextColor="rgba(255,255,255,0.2)"
        value={value}
        onChangeText={onChange}
        style={styles.input}
        textAlignVertical="top"
        maxLength={5000}
      />
      <View style={styles.actions}>
        <SecondaryButton label="Back" onPress={() => setStep(0)} />
        <PrimaryButton
          label={sending ? "Sending..." : "Share Request"}
          disabled={sending || !value.trim()}
          onPress={() => onSubmit(selected)}
        />
      </View>
    </View>
  );
}

function IntensitySlider({
  category,
  icon,
  value,
  onChange,
}: {
  category: string;
  icon: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [width, setWidth] = useState(1);
  const active = value > 0;
  const updateFromPress = (event: GestureResponderEvent) => {
    onChange(
      Math.max(
        0,
        Math.min(10, Math.round((event.nativeEvent.locationX / width) * 10)),
      ),
    );
  };

  return (
    <View style={styles.slider}>
      <View style={styles.sliderHeader}>
        <View style={styles.sliderLabel}>
          <Text style={[styles.sliderIcon, active && styles.active]}>{icon}</Text>
          <Text style={[styles.sliderName, active && styles.active]}>
            {category}
          </Text>
        </View>
        <Text style={[styles.sliderValue, active && styles.sliderValueActive]}>
          {value}
        </Text>
      </View>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityValue={{ min: 0, max: 10, now: value }}
        accessibilityActions={[
          { name: "increment", label: "Increase intensity" },
          { name: "decrement", label: "Decrease intensity" },
        ]}
        onAccessibilityAction={(event) =>
          onChange(
            event.nativeEvent.actionName === "increment"
              ? Math.min(10, value + 1)
              : Math.max(0, value - 1),
          )
        }
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onPress={updateFromPress}
        style={styles.trackTouch}
      >
        <View style={styles.track} />
        <View style={[styles.fill, { width: `${value * 10}%` }]} />
        <View
          style={[
            styles.thumb,
            { left: `${value * 10}%` },
            active && styles.thumbActive,
          ]}
        />
      </Pressable>
    </View>
  );
}

function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  title: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 14,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
  },
  sliderList: { gap: 11 },
  slider: { gap: 4 },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sliderLabel: { flexDirection: "row", gap: 8, alignItems: "center" },
  sliderIcon: {
    width: 16,
    color: colors.muted,
    fontFamily: fonts.body,
    textAlign: "center",
  },
  sliderName: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  active: { color: "rgba(255,255,255,0.85)" },
  sliderValue: {
    width: 20,
    color: "rgba(255,255,255,0.25)",
    fontFamily: fonts.mono,
    fontSize: 12,
    textAlign: "right",
  },
  sliderValueActive: { color: colors.accent },
  trackTouch: { height: 24, justifyContent: "center" },
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  fill: {
    position: "absolute",
    left: 0,
    height: 1,
    backgroundColor: colors.accent,
  },
  thumb: {
    position: "absolute",
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  thumbActive: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  generate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  generateText: { color: colors.mutedSoft, fontFamily: fonts.bodyMedium, fontSize: 10 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  pill: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(249,115,22,0.1)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.2)",
  },
  pillText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 9 },
  pillValue: { color: colors.accent, fontFamily: fonts.monoMedium, fontSize: 9 },
  input: {
    minHeight: 92,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 2 },
  secondary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  secondaryText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 12 },
  primary: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  primaryText: { color: colors.black, fontFamily: fonts.displayMedium, fontSize: 12 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.35 },
});
