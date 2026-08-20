import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { fonts, radii, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    btn: {
      width: "100%",
      paddingVertical: 14,
      backgroundColor: colors.buttonPrimary,
      borderRadius: radii.glass,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 1.01 }],
    },
    disabled: {
      opacity: 0.4,
    },
    label: {
      color: colors.buttonOnPrimary,
      fontSize: 14,
      fontWeight: "500",
      fontFamily: fonts.displayMedium,
    },
  });
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.btn,
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.buttonOnPrimary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}
