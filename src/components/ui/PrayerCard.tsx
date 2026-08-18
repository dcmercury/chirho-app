import { Pressable, Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { colors, fonts, radii } from "../../theme/tokens";
import { resolveImage } from "../../lib/assets";
import type { HomePrayerCard } from "../../types/home";

export function PrayerCard({
  card,
  index,
  onPress,
}: {
  card: HomePrayerCard;
  index?: number;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `Open ${card.title}` : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View>
        <Image source={resolveImage(card.image)} style={styles.img} contentFit="cover" />
        {typeof index === "number" ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{index + 1}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {card.title}
        </Text>
        <Text style={styles.verse}>{card.verse}</Text>
        <Text style={styles.text} numberOfLines={3}>
          {card.text}
        </Text>
        {card.date ? <Text style={styles.date}>{card.date}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    borderRadius: radii.card,
    overflow: "hidden",
    backgroundColor: colors.glassFillHover,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  img: {
    width: "100%",
    height: 80,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.badge,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  badgeText: {
    fontFamily: fonts.monoMedium,
    fontSize: 8,
    fontWeight: "600",
    color: colors.white,
  },
  body: {
    padding: 10,
  },
  title: {
    fontFamily: fonts.displayMedium,
    fontSize: 12,
    fontWeight: "500",
    color: colors.white,
    marginBottom: 2,
  },
  verse: {
    fontFamily: fonts.mono,
    fontSize: 8.8,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.44,
    marginBottom: 6,
  },
  text: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.mutedSoft,
    fontFamily: fonts.body,
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: colors.mutedGhost,
    letterSpacing: 0.32,
    marginTop: 6,
  },
});
