import { TextInput, StyleSheet, type TextInputProps } from "react-native";
import { useState } from "react";
import { type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { inputField } from "./inputField";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    input: {
      ...inputField,
      width: "100%",
      backgroundColor: colors.glassFill,
      borderColor: colors.glassBorder,
      color: colors.title,
    },
    focused: {
      borderColor: colors.glassBorderStrong,
      backgroundColor: colors.glassFillHover,
    },
  });
}

export function GlassInput({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const { appearance, colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      keyboardAppearance={appearance === "light" ? "light" : "dark"}
      placeholderTextColor={colors.mutedGhost}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[styles.input, focused && styles.focused, style]}
    />
  );
}
