import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { Stagger } from "../../features/groups/components/Stagger";
import { CloseIcon } from "../../features/groups/components/Icons";
import type { ScriptureSearchHit, SermonScripture } from "../../types/home";
import { ChiRhoMark } from "../ui/ChiRhoMark";
import { LoadingChiRhoOverlay } from "../ui/LoadingChiRhoOverlay";
import { WizardBackdrop } from "../ui/WizardBackdrop";
import { PrayerFocusTypeIcon } from "./PrayerFocusTypeIcon";
import { ScriptureDrawer } from "./ScriptureDrawer";
import { ScriptureSearchChoices } from "./ScriptureSearchChoices";

export type AddSubjectChoice = "person" | "family" | "thing" | "situation";

const choices: { value: AddSubjectChoice; label: string }[] = [
  { value: "person", label: "Person" },
  { value: "family", label: "Family" },
  { value: "thing", label: "Thing" },
  { value: "situation", label: "Situation" },
];

function PersonIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.6} stroke={color} strokeWidth={1.7} />
      <Path
        d="M5.5 19.5c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function FamilyIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={8.2} cy={8} r={2.7} stroke={color} strokeWidth={1.7} />
      <Path
        d="M3.4 19.2c0-2.7 2.1-4.5 4.8-4.5"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Circle cx={15.4} cy={7.6} r={3.2} stroke={color} strokeWidth={1.7} />
      <Path
        d="M10.2 19.5c0-3.2 2.5-5.3 5.6-5.3s5.6 2.1 5.6 5.3"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    watermark: {
      position: "absolute",
      top: 20,
      right: 20,
      zIndex: 2,
      opacity: 0.14,
    },
    scroll: { flex: 1 },
    content: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 26,
      paddingVertical: 32,
    },
    eyebrow: {
      color: colors.accent,
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      letterSpacing: 1,
      marginBottom: 10,
    },
    title: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 34,
      letterSpacing: -0.8,
      marginBottom: 26,
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
      gap: 14,
    },
    choiceGroup: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
      gap: 14,
      flexGrow: 1,
      flexShrink: 1,
    },
    option: {
      alignItems: "center",
      gap: 10,
    },
    pressed: { opacity: 0.65, transform: [{ scale: 0.96 }] },
    optionIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.accentBorderMuted,
      backgroundColor: colors.accentFillMid,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "#000000",
      alignItems: "center",
      justifyContent: "center",
    },
    cancelRow: {
      alignItems: "center",
      marginTop: 56,
    },
    optionLabel: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 13,
      fontWeight: "500",
      textAlign: "center",
    },
  });
}

/** The Person, Family, Thing and Situation circles. */
export function AddSubjectChoices({
  onSelect,
  animated = false,
  enterDelay = 260,
}: {
  onSelect: (choice: AddSubjectChoice) => void;
  animated?: boolean;
  enterDelay?: number;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  return (
    <View style={styles.choiceGroup}>
      {choices.map((choice, index) => {
        const button = (
          <Pressable
            key={choice.value}
            accessibilityLabel={choice.label}
            accessibilityRole="button"
            onPress={() => onSelect(choice.value)}
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}
          >
            <View style={styles.optionIcon}>
              {choice.value === "person" ? (
                <PersonIcon color={colors.accent} size={24} />
              ) : choice.value === "family" ? (
                <FamilyIcon color={colors.accent} size={24} />
              ) : (
                <PrayerFocusTypeIcon
                  type={choice.value === "thing" ? "pet" : "situation"}
                  color={colors.accent}
                  size={24}
                />
              )}
            </View>
            <Text style={styles.optionLabel}>{choice.label}</Text>
          </Pressable>
        );
        // Rising delays walk the circles in from left to right.
        return animated ? (
          <Stagger key={choice.value} delay={enterDelay + index * 90}>
            {button}
          </Stagger>
        ) : (
          button
        );
      })}
    </View>
  );
}

export function AddSubjectSheet({
  visible,
  onClose,
  onDismiss,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  onSelect: (choice: AddSubjectChoice) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(false);
  const [returnedFromSearch, setReturnedFromSearch] = useState(false);
  const [scripture, setScripture] = useState<SermonScripture | null>(null);
  const [topic, setTopic] = useState<string | null>(null);

  useEffect(() => {
    if (visible) return;
    setSearching(false);
    setSearchStep(false);
    setReturnedFromSearch(false);
    setScripture(null);
    setTopic(null);
  }, [visible]);

  const onSearchStep = (active: boolean) => {
    if (active) setReturnedFromSearch(true);
    setSearchStep(active);
  };

  const openPassage = (hit: ScriptureSearchHit, nextTopic?: string) => {
    setTopic(nextTopic ?? null);
    setScripture({
      reference: hit.reference,
      passageId: hit.passageId,
      kind: "cited",
    });
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onDismiss={onDismiss}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <WizardBackdrop />
        <View pointerEvents="none" style={styles.watermark}>
          <ChiRhoMark width={76} height={101} />
        </View>
        <ScrollView
          key={visible ? "open" : "closed"}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          style={styles.scroll}
        >
          {searchStep ? null : (
            <Animated.View exiting={FadeOut.duration(280)}>
              <Stagger delay={returnedFromSearch ? 0 : 280}>
                <Text style={styles.eyebrow}>DAILY PRAYER DECK</Text>
              </Stagger>
              <Stagger delay={returnedFromSearch ? 40 : 420}>
                <Text style={styles.title}>I want to pray for</Text>
              </Stagger>
              <View style={styles.row}>
                <AddSubjectChoices
                  animated
                  enterDelay={returnedFromSearch ? 80 : 560}
                  onSelect={onSelect}
                />
              </View>
            </Animated.View>
          )}
          <ScriptureSearchChoices
            animated={!returnedFromSearch}
            visible={visible}
            onOpenPassage={openPassage}
            onSearchingChange={setSearching}
            onStepChange={onSearchStep}
          />
          {searchStep ? null : (
            <Animated.View exiting={FadeOut.duration(280)} style={styles.cancelRow}>
              <Stagger delay={returnedFromSearch ? 200 : 1040}>
                <Pressable
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.cancelIcon}>
                    <CloseIcon color="#FFFFFF" size={20} />
                  </View>
                  <Text style={styles.optionLabel}>Cancel</Text>
                </Pressable>
              </Stagger>
            </Animated.View>
          )}
        </ScrollView>
        <LoadingChiRhoOverlay
          label="Searching Scripture…"
          visible={searching}
        />
        <ScriptureDrawer
          scripture={scripture}
          topic={topic}
          onClose={() => setScripture(null)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
