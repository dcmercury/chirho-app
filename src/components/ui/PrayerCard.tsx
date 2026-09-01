import { useEffect } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { fonts, radii, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";
import type { HomePrayerCard } from "../../types/home";
import { AuthenticatedImage } from "./AuthenticatedImage";

function logCardVisual(
  phase: string,
  cardKey: string,
  imagePath: string,
  active: boolean,
) {
  if (!__DEV__) return;
  console.log("[PrayerDeck][Card]", {
    phase,
    cardKey,
    imagePath,
    active,
    timestamp: new Date().toISOString(),
  });
}

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
      width: "100%",
      borderRadius: 18,
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
      height: 252,
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
      minHeight: 180,
      padding: 16,
    },
    title: {
      fontFamily: fonts.displayMedium,
      fontSize: 12,
      fontWeight: "500",
      color: colors.title,
      marginBottom: 2,
    },
    deckTitle: {
      fontSize: 20,
      lineHeight: 24,
      marginBottom: 6,
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
      fontSize: 13,
      lineHeight: 19,
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
  contentVisible = true,
}: {
  card: HomePrayerCard;
  index?: number;
  onPress?: () => void;
  variant?: "default" | "deck";
  contentVisible?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const isDeckCard = variant === "deck";
  const reducedMotion = useReducedMotion();
  const contentOpacity = useSharedValue(isDeckCard ? 0 : 1);
  const cardKey =
    card.prayeruuid ||
    `${card.subjectType || "prayer"}:${card.subjectId || card.deckIndex || card.title}`;

  useEffect(() => {
    cancelAnimation(contentOpacity);
    if (!isDeckCard) {
      contentOpacity.value = 1;
      return;
    }
    if (!contentVisible) {
      contentOpacity.value = 0;
      return;
    }
    logCardVisual("image-active", cardKey, card.image, true);
    if (reducedMotion) {
      contentOpacity.value = 1;
      logCardVisual("text-visible-reduced-motion", cardKey, card.image, true);
      return;
    }
    logCardVisual("text-fade-start", cardKey, card.image, true);
    contentOpacity.value = 0;
    contentOpacity.value = withDelay(
      120,
      withTiming(1, {
        duration: 800,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }, (finished) => {
        if (finished) {
          runOnJS(logCardVisual)("text-fade-complete", cardKey, card.image, true);
        }
      }),
    );
  }, [
    card.image,
    cardKey,
    contentOpacity,
    contentVisible,
    isDeckCard,
    reducedMotion,
  ]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

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
        <AuthenticatedImage
          contentFit="cover"
          onLoad={() =>
            logCardVisual("image-loaded", cardKey, card.image, contentVisible)
          }
          path={card.image}
          recyclingKey={card.image}
          style={[styles.img, isDeckCard && styles.deckImage]}
          transition={0}
        />
        {typeof index === "number" ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{index + 1}</Text>
          </View>
        ) : null}
      </View>
      <Animated.View
        style={[styles.body, isDeckCard && styles.deckBody, contentStyle]}
      >
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
      </Animated.View>
    </Pressable>
  );
}
