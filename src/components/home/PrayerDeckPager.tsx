import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  type ReactNode,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";
import type { PrayerDeckCard } from "../../types/home";
import { PrayerCard } from "../ui/PrayerCard";

const STAGE_HEIGHT = 330;
const PAGE_DISTANCE = 286;
const SWIPE_THRESHOLD = 54;
const VELOCITY_THRESHOLD = 620;
const TRANSITION_MS = 360;

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
  const translateY = useSharedValue(0);
  const transitioning = useSharedValue(false);
  const reducedMotion = useReducedMotion();
  const currentCard = cards[currentIndex];
  const previousCard = cards[currentIndex - 1];
  const nextCard = cards[currentIndex + 1];

  const commitIndex = useCallback(
    (nextIndex: number) => {
      onIndexChange(nextIndex);
    },
    [onIndexChange],
  );

  const move = useCallback(
    (direction: -1 | 1) => {
      if (disabled || transitioning.value) return;
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= cards.length) return;

      if (reducedMotion) {
        commitIndex(nextIndex);
        return;
      }

      transitioning.value = true;
      translateY.value = withTiming(
        direction === 1 ? -PAGE_DISTANCE : PAGE_DISTANCE,
        {
          duration: TRANSITION_MS,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        },
        (finished) => {
          translateY.value = 0;
          transitioning.value = false;
          if (finished) runOnJS(commitIndex)(nextIndex);
        },
      );
    },
    [
      cards.length,
      commitIndex,
      currentIndex,
      disabled,
      reducedMotion,
      transitioning,
      translateY,
    ],
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
    .onUpdate((event) => {
      if (transitioning.value || reducedMotion) return;
      const atFirst = currentIndex === 0 && event.translationY > 0;
      const atLast =
        currentIndex === cards.length - 1 && event.translationY < 0;
      translateY.value =
        atFirst || atLast ? event.translationY * 0.16 : event.translationY;
    })
    .onEnd((event) => {
      if (transitioning.value) return;
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
        if (reducedMotion) {
          translateY.value = 0;
          runOnJS(commitIndex)(nextIndex);
          return;
        }
        transitioning.value = true;
        translateY.value = withTiming(
          wantsNext ? -PAGE_DISTANCE : PAGE_DISTANCE,
          {
            duration: TRANSITION_MS,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
          },
          (finished) => {
            translateY.value = 0;
            transitioning.value = false;
            if (finished) runOnJS(commitIndex)(nextIndex);
          },
        );
        return;
      }

      translateY.value = withTiming(0, {
        duration: 240,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      });
    });

  const currentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateY.value),
      [0, PAGE_DISTANCE],
      [1, 0.12],
      Extrapolation.CLAMP,
    ),
    transform: [
      { translateY: translateY.value },
      {
        scale: interpolate(
          Math.abs(translateY.value),
          [0, PAGE_DISTANCE],
          [1, 0.965],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const previousStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, PAGE_DISTANCE],
      [0.12, 1],
      Extrapolation.CLAMP,
    ),
    transform: [{ translateY: translateY.value - PAGE_DISTANCE }],
  }));

  const nextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-PAGE_DISTANCE, 0],
      [1, 0.12],
      Extrapolation.CLAMP,
    ),
    transform: [{ translateY: translateY.value + PAGE_DISTANCE }],
  }));

  const renderCard = (
    card: PrayerDeckCard | undefined,
    index: number,
    animatedStyle: object,
    interactive: boolean,
  ): ReactNode =>
    card ? (
      <Animated.View
        pointerEvents={interactive ? "auto" : "none"}
        style={[styles.page, animatedStyle]}
      >
        <PrayerCard
          card={card}
          index={index}
          variant="deck"
          onPress={interactive ? () => onOpenCard(card) : undefined}
        />
      </Animated.View>
    ) : null;

  if (!currentCard) return null;

  return (
    <View>
      <GestureDetector gesture={pan}>
        <Animated.View style={styles.stage}>
          {renderCard(previousCard, currentIndex - 1, previousStyle, false)}
          {renderCard(currentCard, currentIndex, currentStyle, true)}
          {renderCard(nextCard, currentIndex + 1, nextStyle, false)}
        </Animated.View>
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
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  page: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
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
