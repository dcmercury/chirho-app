import { Text, View, StyleSheet } from "react-native";
import { fonts, radii, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
}

export function ErrorBanner({ message }: { message: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}
