import { Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { colors, fonts, radii } from "../../theme/tokens";

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
        <ActivityIndicator color={colors.black} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: "100%",
    paddingVertical: 14,
    backgroundColor: colors.white,
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
    color: colors.black,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: fonts.displayMedium,
  },
});
