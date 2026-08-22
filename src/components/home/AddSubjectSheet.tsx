import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { Stagger } from "../../features/groups/components/Stagger";
import { CloseIcon } from "../../features/groups/components/Icons";
import { ChiRhoMark } from "../ui/ChiRhoMark";
import { WizardBackdrop } from "../ui/WizardBackdrop";
import { PrayerFocusTypeIcon } from "./PrayerFocusTypeIcon";

export type AddSubjectChoice = "person" | "thing" | "situation";

const choices: { value: AddSubjectChoice; label: string }[] = [
  { value: "person", label: "Person" },
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
    content: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 26,
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
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    option: {
      alignItems: "center",
      gap: 10,
    },
    pressed: { opacity: 0.65, transform: [{ scale: 0.96 }] },
    optionIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 1,
      borderColor: colors.accentBorderMuted,
      backgroundColor: colors.accentFillMid,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: "#000000",
      alignItems: "center",
      justifyContent: "center",
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
  const { colors } = useTheme();

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onDismiss={onDismiss}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <WizardBackdrop />
        <View pointerEvents="none" style={styles.watermark}>
          <ChiRhoMark width={76} height={101} />
        </View>
        <View style={styles.content}>
          <Stagger delay={60}>
            <Text style={styles.eyebrow}>DAILY PRAYER DECK</Text>
          </Stagger>
          <Stagger delay={140}>
            <Text style={styles.title}>I want to pray for</Text>
          </Stagger>
          <View style={styles.row}>
            {choices.map((choice, index) => (
              // Rising delays walk the circles in from left to right.
              <Stagger key={choice.value} delay={260 + index * 90}>
                <Pressable
                  accessibilityLabel={choice.label}
                  accessibilityRole="button"
                  onPress={() => onSelect(choice.value)}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.optionIcon}>
                    {choice.value === "person" ? (
                      <PersonIcon color={colors.accent} size={24} />
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
              </Stagger>
            ))}
            <Stagger delay={530}>
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
          </View>
        </View>
      </View>
    </Modal>
  );
}
