import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";

const chiRhoIcon = require("../../../assets/onboarding/chirho.svg");
const MINIMUM_VISIBLE_MS = 500;
const RING_SIZE = 128;
const STROKE_WIDTH = 2;
const RING_RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_ARC = RING_CIRCUMFERENCE * 0.72;
const SPIN_INTO_FAST_MS = 1800;
const SPIN_INTO_SLOW_MS = 2000;

interface LoadingChiRhoOverlayProps {
  visible: boolean;
  label?: string;
  variant?: "cover" | "watermark";
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    overlay: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 1000,
      elevation: 1000,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.loading,
      paddingHorizontal: 32,
    },
    spinner: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    logo: {
      width: 52,
      height: 70,
    },
    watermark: {
      backgroundColor: "transparent",
      zIndex: 4,
      elevation: 4,
    },
    watermarkSpinner: {
      opacity: 0.58,
    },
  });
}

function OrbitProgress({
  color,
  trackColor,
}: {
  color: string;
  trackColor: string;
}) {
  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={trackColor}
        strokeWidth={1}
      />
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={`${RING_ARC} ${RING_CIRCUMFERENCE}`}
        rotation={-90}
        originX={RING_SIZE / 2}
        originY={RING_SIZE / 2}
      />
    </Svg>
  );
}

export function LoadingChiRhoOverlay({
  visible,
  label = "Gathering your prayers…",
  variant = "cover",
}: LoadingChiRhoOverlayProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const reduceMotion = Boolean(useReducedMotion());
  const [mounted, setMounted] = useState(visible);
  const shownAtRef = useRef(visible ? Date.now() : 0);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayOpacity = useSharedValue(visible ? 1 : 0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      shownAtRef.current = Date.now();
      setMounted(true);
      overlayOpacity.value = 1;
      return;
    }
    if (!mounted) return;

    const remaining = Math.max(
      0,
      MINIMUM_VISIBLE_MS - (Date.now() - shownAtRef.current),
    );
    const hide = () => {
      overlayOpacity.value = withTiming(
        0,
        { duration: reduceMotion ? 0 : 240, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        },
      );
    };
    exitTimerRef.current = setTimeout(hide, remaining);

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [mounted, overlayOpacity, reduceMotion, visible]);

  useEffect(() => {
    if (!mounted || reduceMotion) {
      cancelAnimation(spin);
      spin.value = 0;
      return;
    }

    spin.value = 0;
    spin.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: SPIN_INTO_FAST_MS,
          easing: Easing.in(Easing.cubic),
        }),
        withTiming(2, {
          duration: SPIN_INTO_SLOW_MS,
          easing: Easing.out(Easing.cubic),
        }),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(spin);
  }, [mounted, reduceMotion, spin]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  if (!mounted) return null;

  return (
    <Animated.View
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      pointerEvents={variant === "watermark" ? "none" : "auto"}
      style={[
        styles.overlay,
        variant === "watermark" && styles.watermark,
        overlayStyle,
      ]}
    >
      <View
        style={[
          styles.spinner,
          variant === "watermark" && styles.watermarkSpinner,
        ]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
          <OrbitProgress
            color={colors.creamStroke}
            trackColor={colors.cardBorder}
          />
        </Animated.View>
        <Image
          accessible={false}
          contentFit="contain"
          source={chiRhoIcon}
          style={styles.logo}
          tintColor={colors.creamTint}
        />
      </View>
    </Animated.View>
  );
}
