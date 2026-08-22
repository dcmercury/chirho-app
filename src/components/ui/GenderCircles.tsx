import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";
import type { LovedOneGender } from "../../types/home";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexShrink: 0,
      marginHorizontal: 6,
    },
    circle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glassFill,
    },
    circleSm: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    circleActive: {
      backgroundColor: colors.accentFillPill,
      borderColor: colors.accentBorderPill,
    },
    label: {
      color: colors.mutedSoft,
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
    },
    labelSm: {
      fontSize: 11,
    },
    labelActive: {
      color: colors.accentText,
    },
  });
}

export function GenderCircles({
  value,
  onChange,
  disabled = false,
  size = "md",
}: {
  value?: LovedOneGender | null;
  onChange: (gender: LovedOneGender) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const styles = useThemedStyles(createStyles);
  const compact = size === "sm";
  return (
    <View style={styles.row}>
      {(["male", "female"] as const).map((gender) => {
        const active = value === gender;
        return (
          <Pressable
            key={gender}
            accessibilityLabel={gender === "male" ? "Male" : "Female"}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            hitSlop={compact ? 6 : 0}
            onPress={() => onChange(gender)}
            style={[
              styles.circle,
              compact && styles.circleSm,
              active && styles.circleActive,
              disabled && !active && { opacity: 0.4 },
            ]}
          >
            <Text
              style={[
                styles.label,
                compact && styles.labelSm,
                active && styles.labelActive,
              ]}
            >
              {gender === "male" ? "M" : "F"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
