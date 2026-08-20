import { Text, View, StyleSheet } from "react-native";
import { type as typography, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      marginBottom: 16,
    },
    title: {
      ...typography.heading1,
      color: colors.title,
    },
    subtitle: {
      ...typography.heading1,
      color: colors.subtitle,
    },
  });
}

export function DisplayTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        {title}
        {subtitle ? (
          <Text style={styles.subtitle}>
            {"\n"}
            {subtitle}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}
