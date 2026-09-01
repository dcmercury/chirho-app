import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { fonts, type ColorTokens } from "../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../theme/ThemeProvider";
import { GlassInput } from "../../../components/ui/GlassInput";
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

const INTRO_PRESETS = [3, 4, 6, 3, 5, 2] as const;
const INTRO_HOLD_MS = 520;
const INTRO_STAGGER_MS = 85;
const INTRO_DURATION_MS = 740;
const INTRO_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const THUMB_SIZE = 24;

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
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [step, setStep] = useState<0 | 1>(0);
  const introConsumedRef = useRef(false);
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
          Slide to set intensity (0–10) for each area needing prayer.
        </Text>
        <View style={styles.sliderList}>
          {CATEGORIES.map(({ name: category, Icon }, index) => (
            <IntensitySlider
              key={category}
              category={category}
              Icon={Icon}
              value={intensities[category]}
              playIntro={!introConsumedRef.current}
              introFrom={INTRO_PRESETS[index] ?? 0}
              introDelay={INTRO_HOLD_MS + index * INTRO_STAGGER_MS}
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
          <PrimaryButton
            label="Continue"
            onPress={() => {
              introConsumedRef.current = true;
              setStep(1);
            }}
          />
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
      <GlassInput
        autoFocus
        multiline
        editable={!sending}
        placeholder="What would you like prayer for?"
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

const SLIDER_MIN = 0;
const SLIDER_MAX = 10;

function snapIntensity(x: number, width: number) {
  if (width <= 0) return SLIDER_MIN;
  return Math.max(
    SLIDER_MIN,
    Math.min(SLIDER_MAX, Math.round((x / width) * SLIDER_MAX)),
  );
}

function IntensitySlider({
  category,
  Icon,
  value,
  playIntro,
  introFrom,
  introDelay,
  onChange,
}: {
  category: string;
  Icon: ComponentType<{ color?: string; size?: number }>;
  value: number;
  playIntro: boolean;
  introFrom: number;
  introDelay: number;
  onChange: (value: number) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldIntro = playIntro && !reducedMotion && introFrom > 0;
  const widthRef = useRef(1);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const progress = useSharedValue(shouldIntro ? introFrom : value);
  const trackWidth = useSharedValue(1);
  const [display, setDisplay] = useState(shouldIntro ? introFrom : value);
  const active = display > 0;

  useEffect(() => {
    if (!shouldIntro) return;
    progress.value = withDelay(
      introDelay,
      withTiming(0, {
        duration: INTRO_DURATION_MS,
        easing: INTRO_EASING,
        reduceMotion: ReduceMotion.System,
      }),
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [introDelay, progress, shouldIntro]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplay)(current);
      }
    },
  );

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0, progress.value) / SLIDER_MAX }],
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          (Math.max(0, progress.value) / SLIDER_MAX) * trackWidth.value -
          THUMB_SIZE / 2,
      },
    ],
  }));

  const commit = useCallback((x: number) => {
    cancelAnimation(progress);
    const next = snapIntensity(x, widthRef.current);
    progress.value = next;
    if (next === valueRef.current) return;
    valueRef.current = next;
    onChangeRef.current(next);
  }, [progress]);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .activeOffsetX([-6, 6])
    .failOffsetY([-18, 18])
    .shouldCancelWhenOutside(false)
    .onStart((event) => {
      commit(event.x);
    })
    .onUpdate((event) => {
      commit(event.x);
    });

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event) => {
      commit(event.x);
    });

  const gesture = Gesture.Exclusive(pan, tap);

  return (
    <View style={styles.slider}>
      <View style={styles.sliderHeader}>
        <View style={styles.sliderLabel}>
          <View style={styles.sliderIcon}>
            <Icon
              color={active ? colors.bodyBright : colors.subtitle}
              size={18}
            />
          </View>
          <Text style={[styles.sliderName, active && styles.active]}>
            {category}
          </Text>
        </View>
        <Text style={[styles.sliderValue, active && styles.sliderValueActive]}>
          {display}
        </Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={`${category} intensity`}
          accessibilityValue={{ min: SLIDER_MIN, max: SLIDER_MAX, now: display }}
          accessibilityActions={[
            { name: "increment", label: "Increase intensity" },
            { name: "decrement", label: "Decrease intensity" },
          ]}
          onAccessibilityAction={(event) => {
            cancelAnimation(progress);
            const next =
              event.nativeEvent.actionName === "increment"
                ? Math.min(SLIDER_MAX, valueRef.current + 1)
                : Math.max(SLIDER_MIN, valueRef.current - 1);
            progress.value = next;
            valueRef.current = next;
            onChange(next);
          }}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            widthRef.current = nextWidth;
            trackWidth.value = nextWidth;
          }}
          style={styles.trackTouch}
        >
          <View style={styles.track} />
          <Animated.View style={[styles.fill, fillStyle]} />
          <Animated.View
            style={[styles.thumb, thumbStyle, active && styles.thumbActive]}
          />
        </View>
      </GestureDetector>
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
  const styles = useThemedStyles(createStyles);
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
  const styles = useThemedStyles(createStyles);
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

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  panel: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.cardFillSoft,
    borderWidth: 1,
    borderColor: colors.glassBorderInput,
  },
  title: {
    color: colors.title,
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
  active: { color: colors.bodyActive },
  sliderValue: {
    width: 20,
    color: colors.mutedSoft,
    fontFamily: fonts.mono,
    fontSize: 12,
    textAlign: "right",
  },
  sliderValueActive: { color: colors.accentText },
  trackTouch: {
    height: 44,
    justifyContent: "center",
    marginHorizontal: 12,
  },
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassFillStrong,
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 20,
    width: "100%",
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    transformOrigin: "0% 50%",
  },
  thumb: {
    position: "absolute",
    top: 10,
    left: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.overlay,
    borderWidth: 1.5,
    borderColor: colors.glassBorderSelected,
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
    backgroundColor: colors.glassFillFaint,
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
    backgroundColor: colors.accentFill,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  pillText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 9 },
  pillValue: { color: colors.accentText, fontFamily: fonts.monoMedium, fontSize: 9 },
  input: {
    minHeight: 132,
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
    backgroundColor: colors.buttonPrimary,
  },
  primaryText: { color: colors.buttonOnPrimary, fontFamily: fonts.displayMedium, fontSize: 12 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.35 },
  });
}
