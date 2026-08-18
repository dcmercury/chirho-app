import { Text, StyleSheet, View } from "react-native";
import { colors, fonts, radii } from "../../theme/tokens";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 12,
    borderRadius: radii.glass,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  text: {
    color: colors.error,
    fontSize: 12.8,
    fontFamily: fonts.body,
  },
});
