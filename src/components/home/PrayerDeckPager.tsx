import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  type ReactNode,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";
import type { PrayerDeckCard } from "../../types/home";
import { PrayerCard } from "../ui/PrayerCard";

const STAGE_HEIGHT = 448;
const PAGE_DISTANCE = 400;
const SWIPE_THRESHOLD = 54;
const VELOCITY_THRESHOLD = 620;

function logPagerTransition(
  phase: string,
  source: "button" | "swipe",
  fromIndex: number,
  toIndex: number,
  translationY?: number,
  velocityY?: number,
) {
  if (!__DEV__) return;
  console.log("[PrayerDeck][Transition]", {
    phase,
    source,
    fromIndex,
    toIndex,
    ...(translationY === undefined ? {} : { translationY }),
    ...(velocityY === undefined ? {} : { velocityY }),
    timestamp: new Date().toISOString(),
  });
}

export interface PrayerDeckPagerHandle {
  previous: () => void;
  next: () => void;
}

interface PrayerDeckPagerProps {
  cards: PrayerDeckCard[];
  currentIndex: number;
  disabled?: boolean;
  onIndexChange: (index: number) => void;
  onOpenCard: (card: PrayerDeckCard) => void;
}

export const PrayerDeckPager = forwardRef<
  PrayerDeckPagerHandle,
  PrayerDeckPagerProps
>(function PrayerDeckPager(
  {
    cards,
    currentIndex,
    disabled = false,
    onIndexChange,
    onOpenCard,
  },
  ref,
) {
  const styles = useThemedStyles(createStyles);
  const currentCard = cards[currentIndex];
  const previousCard = cards[currentIndex - 1];
  const nextCard = cards[currentIndex + 1];

  const commitIndex = useCallback(
    (nextIndex: number, source: "button" | "swipe") => {
      logPagerTransition("index-commit", source, currentIndex, nextIndex);
      onIndexChange(nextIndex);
    },
    [currentIndex, onIndexChange],
  );

  const move = useCallback(
    (direction: -1 | 1) => {
      if (disabled) return;
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= cards.length) return;

      logPagerTransition("image-swap", "button", currentIndex, nextIndex);
      commitIndex(nextIndex, "button");
    },
    [cards.length, commitIndex, currentIndex, disabled],
  );

  useImperativeHandle(
    ref,
    () => ({
      previous: () => move(-1),
      next: () => move(1),
    }),
    [move],
  );

  const pan = Gesture.Pan()
    .enabled(!disabled && cards.length > 1)
    .activeOffsetY([-12, 12])
    .failOffsetX([-28, 28])
    .onEnd((event) => {
      const wantsNext =
        event.translationY < -SWIPE_THRESHOLD ||
        event.velocityY < -VELOCITY_THRESHOLD;
      const wantsPrevious =
        event.translationY > SWIPE_THRESHOLD ||
        event.velocityY > VELOCITY_THRESHOLD;
      const canMoveNext = currentIndex < cards.length - 1;
      const canMovePrevious = currentIndex > 0;
      const nextIndex = wantsNext
        ? currentIndex + 1
        : wantsPrevious
          ? currentIndex - 1
          : currentIndex;

      if (
        (wantsNext && canMoveNext) ||
        (wantsPrevious && canMovePrevious)
      ) {
        runOnJS(logPagerTransition)(
          "image-swap",
          "swipe",
          currentIndex,
          nextIndex,
          event.translationY,
          event.velocityY,
        );
        runOnJS(commitIndex)(nextIndex, "swipe");
        return;
      }

      runOnJS(logPagerTransition)(
        "snap-back",
        "swipe",
        currentIndex,
        currentIndex,
        event.translationY,
        event.velocityY,
      );
    });

  const renderCard = (
    card: PrayerDeckCard | undefined,
    index: number,
    animatedStyle: object,
    interactive: boolean,
  ): ReactNode =>
    card ? (
      <View
        key={
          card.prayeruuid ||
          `${card.subjectType}:${card.subjectId}:${card.deckIndex}`
        }
        pointerEvents={interactive ? "auto" : "none"}
        style={[styles.page, animatedStyle]}
      >
        <PrayerCard
          card={card}
          index={index}
          variant="deck"
          contentVisible={interactive}
          onPress={interactive ? () => onOpenCard(card) : undefined}
        />
      </View>
    ) : null;

  if (!currentCard) return null;

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View style={styles.stage}>
          {renderCard(previousCard, currentIndex - 1, styles.previousPage, false)}
          {renderCard(currentCard, currentIndex, styles.currentPage, true)}
          {renderCard(nextCard, currentIndex + 1, styles.nextPage, false)}
        </View>
      </GestureDetector>
      <View style={styles.hintRow}>
        <View style={styles.hintRule} />
        <Text style={styles.hint}>Swipe up or down · Tap to open</Text>
        <View style={styles.hintRule} />
      </View>
    </View>
  );
});

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  stage: {
    height: STAGE_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  page: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "stretch",
    justifyContent: "center",
  },
  currentPage: {
    opacity: 1,
  },
  previousPage: {
    opacity: 0,
    transform: [{ translateY: -PAGE_DISTANCE }],
  },
  nextPage: {
    opacity: 0,
    transform: [{ translateY: PAGE_DISTANCE }],
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  hintRule: {
    width: 22,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.glassBorder,
  },
  hint: {
    color: colors.mutedSoft,
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.32,
    textTransform: "uppercase",
  },
  });
}
