import { Pressable, Text, StyleSheet } from "react-native";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    text: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: fonts.body,
      textAlign: "center",
      width: "100%",
    },
  });
}

export function GhostBack({
  label = "← Back",
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}
