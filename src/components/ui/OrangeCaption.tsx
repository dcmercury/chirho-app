import { Text, StyleSheet } from "react-native";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    text: {
      fontFamily: fonts.monoMedium,
      fontSize: 12,
      lineHeight: 16.8,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: colors.caption,
      maxWidth: "90%",
      borderLeftWidth: 2,
      borderLeftColor: colors.accent,
      paddingLeft: 16,
    },
  });
}

export function OrangeCaption({ children }: { children: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.text}>{children}</Text>;
}
