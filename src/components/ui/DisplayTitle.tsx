import { Text, StyleSheet, View } from "react-native";
import { colors, type } from "../../theme/tokens";

export function DisplayTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
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

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  title: {
    ...type.heading1,
    color: colors.title,
  },
  subtitle: {
    ...type.heading1,
    color: colors.subtitle,
  },
});
