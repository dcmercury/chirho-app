import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { Stagger } from "../../features/groups/components/Stagger";
import { CloseIcon } from "../../features/groups/components/Icons";
import { ChiRhoMark } from "../ui/ChiRhoMark";
import { WizardBackdrop } from "../ui/WizardBackdrop";
import { PrayerFocusTypeIcon } from "./PrayerFocusTypeIcon";

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
            <View style={styles.choiceGroup}>
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
                </Stagger>
              ))}
            </View>
            <Stagger delay={620}>
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
