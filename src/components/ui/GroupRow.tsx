import { Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { fonts, radii, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";
import { resolveImage } from "../../lib/assets";
import type { PrayerGroup } from "../../types/welcome";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 10,
      borderRadius: radii.glass,
      backgroundColor: colors.cardFill,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    img: {
      width: 40,
      height: 40,
      borderRadius: radii.thumb,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontFamily: fonts.displayMedium,
      fontSize: 12.8,
      fontWeight: "500",
      color: colors.title,
    },
    members: {
      fontFamily: fonts.mono,
      fontSize: 9.6,
      color: colors.mutedFaint,
      textTransform: "uppercase",
      letterSpacing: 0.48,
    },
  });
}

export function GroupRow({ group }: { group: PrayerGroup }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Image source={resolveImage(group.image)} style={styles.img} contentFit="cover" />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={styles.members}>{group.members} members</Text>
      </View>
    </View>
  );
}
