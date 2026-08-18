import { Pressable, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../../theme/tokens";

export function GhostBack({
  label = "← Back",
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.body,
    textAlign: "center",
    width: "100%",
  },
});
