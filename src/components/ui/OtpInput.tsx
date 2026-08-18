import { GlassInput } from "./GlassInput";
import { StyleSheet } from "react-native";
import { fonts } from "../../theme/tokens";

export function OtpInput({
  value,
  onChangeText,
  disabled,
}: {
  value: string;
  onChangeText: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <GlassInput
      value={value}
      onChangeText={(t) => onChangeText(t.replace(/\D/g, "").slice(0, 6))}
      placeholder="000000"
      keyboardType="number-pad"
      maxLength={6}
      editable={!disabled}
      autoFocus
      style={styles.otp}
    />
  );
}

const styles = StyleSheet.create({
  otp: {
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 6,
    fontFamily: fonts.mono,
    paddingVertical: 16,
  },
});
