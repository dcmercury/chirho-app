import { useState } from "react";
import { TextInput, StyleSheet, type TextInputProps } from "react-native";
import { colors, fonts, radii } from "../../theme/tokens";

export function GlassInput({ style, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={colors.mutedGhost}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[styles.input, focused && styles.focused, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.glass,
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.body,
  },
  focused: {
    borderColor: colors.glassBorderStrong,
    backgroundColor: colors.glassFillHover,
  },
});
