import { useState, type ComponentType } from "react";
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
import {
  FamilyIcon,
  FinancesIcon,
  HealthIcon,
  RelationshipsIcon,
  SchoolIcon,
  WorkIcon,
} from "./Icons";

const CATEGORIES = [
  { name: "Family", Icon: FamilyIcon },
  { name: "Work", Icon: WorkIcon },
  { name: "Health", Icon: HealthIcon },
  { name: "School", Icon: SchoolIcon },
  { name: "Relationships", Icon: RelationshipsIcon },
  { name: "Finances", Icon: FinancesIcon },
] as const;

const CATEGORY_TIPS: Record<string, string[]> = {
  Family: [
    "Who in your family needs prayer?",
    "What would bring peace or wisdom right now?",
    "How can the group pray for you specifically?",
  ],
  Work: [
    "What decision, task, or relationship feels important?",
    "Where do you need wisdom or steadiness?",
    "Is there an upcoming moment the group can pray about?",
  ],
  Health: [
    "Share only the health details you are comfortable sharing.",
    "Would prayer for strength, peace, or healing help most?",
    "Is there an appointment or next step coming up?",
  ],
  School: [
    "Is there a class, exam, or decision ahead?",
    "Where do you need focus, confidence, or wisdom?",
    "How can the group support you this week?",
  ],
  Relationships: [
    "Which relationship would you like prayer for?",
    "Do you need patience, clarity, or reconciliation?",
    "What outcome are you hoping and praying for?",
  ],
  Finances: [
    "Is there a decision or immediate need to pray about?",
    "Would wisdom, provision, or peace help most?",
    "Share only the details you are comfortable sharing.",
  ],
};

const GENERAL_TIPS = [
  "What feels most important right now?",
  "Where do you need wisdom, peace, or strength?",
  "How can the group pray for you specifically?",
];

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
    Object.fromEntries(CATEGORIES.map(({ name }) => [name, 0])),
  );

  const selected = Object.entries(intensities)
    .filter(([, intensity]) => intensity > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, intensity]) => ({ category, intensity }));
  const canGenerate = selected.length > 0 || value.trim().length > 0;
  const primaryCategory = selected[0]?.category;
  const writingTips = primaryCategory
    ? CATEGORY_TIPS[primaryCategory]
    : GENERAL_TIPS;

  if (step === 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>What&apos;s on your heart?</Text>
        <Text style={styles.subtitle}>
          Tap to set intensity (0–10) for each area needing prayer.
        </Text>
        <View style={styles.sliderList}>
          {CATEGORIES.map(({ name: category, Icon }) => (
            <IntensitySlider
              key={category}
              category={category}
              Icon={Icon}
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
      <Text style={styles.title}>Share a prayer request</Text>
      <View style={styles.categoryActionRow}>
        {selected.length > 0 ? (
          <View style={styles.pills}>
            {selected.map(({ category, intensity }) => (
              <View key={category} style={styles.pill}>
                <Text style={styles.pillText}>{category}</Text>
                <Text style={styles.pillValue}>{intensity}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.pills} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: generating || !canGenerate }}
          disabled={generating || !canGenerate}
          onPress={() => onGenerate(selected)}
          style={({ pressed }) => [
            styles.generate,
            pressed && styles.pressed,
            (generating || !canGenerate) && styles.disabled,
          ]}
        >
          <Text style={styles.generateText}>
            {generating ? "Writing..." : "Write for me"}
          </Text>
        </Pressable>
      </View>
      {!canGenerate ? (
        <Text style={styles.subtitle}>
          Choose at least one prayer area or add a few details first.
        </Text>
      ) : null}
      <TextInput
        autoFocus
        multiline
        editable={!sending}
        placeholder="What would you like prayer for?"
        placeholderTextColor="rgba(255,255,255,0.5)"
        value={value}
        onChangeText={onChange}
        style={styles.input}
        textAlignVertical="top"
        maxLength={5000}
      />
      <View style={styles.tips}>
        <Text style={styles.tipsLabel}>
          {primaryCategory ? `${primaryCategory} prompts` : "Writing prompts"}
        </Text>
        {writingTips.map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
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
  Icon,
  value,
  onChange,
}: {
  category: string;
  Icon: ComponentType<{ color?: string; size?: number }>;
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
          <View style={styles.sliderIcon}>
            <Icon
              color={active ? "rgba(255,255,255,0.9)" : colors.subtitle}
              size={18}
            />
          </View>
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
    backgroundColor: "rgba(10,8,7,0.52)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  title: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 14,
  },
  subtitle: {
    color: colors.subtitle,
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
  sliderIcon: { width: 20, alignItems: "center", justifyContent: "center" },
  sliderName: {
    color: colors.subtitle,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  active: { color: "rgba(255,255,255,0.85)" },
  sliderValue: {
    width: 20,
    color: colors.mutedSoft,
    fontFamily: fonts.mono,
    fontSize: 12,
    textAlign: "right",
  },
  sliderValueActive: { color: colors.accent },
  trackTouch: {
    height: 24,
    justifyContent: "center",
    marginHorizontal: 10,
  },
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
  categoryActionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  generateText: {
    color: colors.mutedStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
  },
  pills: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 4 },
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
    minHeight: 132,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(10,8,7,0.44)",
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  tips: { gap: 5, paddingTop: 2 },
  tipsLabel: {
    color: colors.mutedStrong,
    fontFamily: fonts.monoMedium,
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  tipDot: {
    width: 3,
    height: 3,
    marginTop: 6,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  tipText: {
    flex: 1,
    color: colors.subtitle,
    fontFamily: fonts.body,
    fontSize: 9,
    lineHeight: 14,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 2 },
  secondary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  secondaryText: {
    color: colors.mutedStrong,
    fontFamily: fonts.body,
    fontSize: 12,
  },
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
