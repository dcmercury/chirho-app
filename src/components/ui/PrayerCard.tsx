import { Pressable, Text, View, StyleSheet } from "react-native";
import { fonts, radii, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";
import type { HomePrayerCard } from "../../types/home";
import { KenBurnsImage } from "./KenBurnsImage";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      width: 160,
      borderRadius: radii.card,
      overflow: "hidden",
      backgroundColor: colors.cardFill,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    deckCard: {
      width: 238,
      borderRadius: 16,
    },
    pressed: {
      opacity: 0.76,
      transform: [{ scale: 0.98 }],
    },
    img: {
      width: "100%",
      height: 80,
    },
    deckImage: {
      height: 124,
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
      backgroundColor: colors.cardFill,
    },
    deckBody: {
      minHeight: 136,
      padding: 14,
    },
    title: {
      fontFamily: fonts.displayMedium,
      fontSize: 12,
      fontWeight: "500",
      color: colors.title,
      marginBottom: 2,
    },
    deckTitle: {
      fontSize: 16,
      lineHeight: 19,
      marginBottom: 4,
    },
    verse: {
      fontFamily: fonts.mono,
      fontSize: 8.8,
      color: colors.accentText,
      textTransform: "uppercase",
      letterSpacing: 0.44,
      marginBottom: 6,
    },
    text: {
      fontSize: 10,
      lineHeight: 14,
      color: colors.cardText,
      fontFamily: fonts.body,
    },
    deckText: {
      fontSize: 11.5,
      lineHeight: 17,
    },
    date: {
      fontFamily: fonts.mono,
      fontSize: 8,
      color: colors.cardMeta,
      letterSpacing: 0.32,
      marginTop: 6,
    },
  });
}

export function PrayerCard({
  card,
  index,
  onPress,
  variant = "default",
}: {
  card: HomePrayerCard;
  index?: number;
  onPress?: () => void;
  variant?: "default" | "deck";
}) {
  const styles = useThemedStyles(createStyles);
  const isDeckCard = variant === "deck";

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `Open ${card.title}` : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isDeckCard && styles.deckCard,
        pressed && styles.pressed,
      ]}
    >
      <View>
        <KenBurnsImage
          path={card.image}
          paths={card.images}
          style={[styles.img, isDeckCard && styles.deckImage]}
        />
        {typeof index === "number" ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{index + 1}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.body, isDeckCard && styles.deckBody]}>
        <Text
          style={[styles.title, isDeckCard && styles.deckTitle]}
          numberOfLines={isDeckCard ? 2 : 1}
        >
          {card.title}
        </Text>
        <Text style={styles.verse}>{card.verse}</Text>
        <Text
          style={[styles.text, isDeckCard && styles.deckText]}
          numberOfLines={isDeckCard ? 5 : 3}
        >
          {card.text}
        </Text>
        {card.date ? <Text style={styles.date}>{card.date}</Text> : null}
      </View>
    </Pressable>
  );
}
