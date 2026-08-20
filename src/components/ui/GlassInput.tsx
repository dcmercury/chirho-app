import { TextInput, StyleSheet, type TextInputProps } from "react-native";
import { useState } from "react";
import { fonts, radii, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    input: {
      width: "100%",
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.glassFill,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.glass,
      color: colors.title,
      fontSize: 14,
      fontFamily: fonts.body,
    },
    focused: {
      borderColor: colors.glassBorderStrong,
      backgroundColor: colors.glassFillHover,
    },
  });
}

export function GlassInput({ style, ...props }: TextInputProps) {
  const { appearance, colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      keyboardAppearance={appearance === "light" ? "light" : "dark"}
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
