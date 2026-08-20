import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import Svg, { Circle } from "react-native-svg";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";

const chiRhoIcon = require("../../../assets/onboarding/chirho.svg");
const MINIMUM_VISIBLE_MS = 500;

interface LoadingChiRhoOverlayProps {
  visible: boolean;
  label?: string;
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
      alignItems: "center",
      justifyContent: "center",
    },
    glow: {
      position: "absolute",
      width: "54%",
      height: "54%",
      borderRadius: 999,
      backgroundColor: colors.accentFillMid,
      shadowColor: colors.accent,
      shadowOpacity: 0.28,
      shadowRadius: 28,
    },
    logoWrap: {
      alignItems: "center",
      justifyContent: "center",
    },
    logo: {
      width: 92,
      height: 124,
    },
    label: {
      minHeight: 18,
      marginTop: 12,
      color: colors.mutedStrong,
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      letterSpacing: 0.7,
      textAlign: "center",
      textTransform: "uppercase",
    },
  });
}

export function LoadingChiRhoOverlay({
  visible,
  label = "Gathering your prayers…",
}: LoadingChiRhoOverlayProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [reduceMotion, setReduceMotion] = useState(false);
  const shownAtRef = useRef(visible ? Date.now() : 0);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const spinnerEntrance = useRef(new Animated.Value(0)).current;
  const logoEntrance = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const ringSize = Math.min(width * 0.72, 280);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      shownAtRef.current = Date.now();
      setMounted(true);
      overlayOpacity.stopAnimation();
      overlayOpacity.setValue(1);
      return;
    }
    if (!mounted) return;

    const remaining = Math.max(
      0,
      MINIMUM_VISIBLE_MS - (Date.now() - shownAtRef.current),
    );
    exitTimerRef.current = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: reduceMotion ? 0 : 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }, remaining);

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      overlayOpacity.stopAnimation();
    };
  }, [mounted, overlayOpacity, reduceMotion, visible]);

  useEffect(() => {
    if (!mounted) return;
    if (reduceMotion) {
      ringRotation.setValue(0);
      glowPulse.setValue(0.5);
      spinnerEntrance.setValue(1);
      logoEntrance.setValue(1);
      return;
    }

    ringRotation.setValue(0);
    glowPulse.setValue(0);
    spinnerEntrance.setValue(0);
    logoEntrance.setValue(0);

    const rotation = Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    const pulsing = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    const spinnerFade = Animated.timing(spinnerEntrance, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    const entrance = Animated.sequence([
      Animated.delay(90),
      Animated.timing(logoEntrance, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    rotation.start();
    pulsing.start();
    spinnerFade.start();
    entrance.start();

    return () => {
      rotation.stop();
      pulsing.stop();
      spinnerFade.stop();
      entrance.stop();
    };
  }, [
    glowPulse,
    logoEntrance,
    mounted,
    reduceMotion,
    ringRotation,
    spinnerEntrance,
  ]);

  if (!mounted) return null;

  const rotation = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.55],
  });
  const glowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });
  const logoScale = logoEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1],
  });

  return (
    <Animated.View
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      pointerEvents="auto"
      style={[styles.overlay, { opacity: overlayOpacity }]}
    >
      <Animated.View
        style={[
          styles.spinner,
          {
            width: ringSize,
            height: ringSize,
            opacity: spinnerEntrance,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ rotate: rotation }] }]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 200 200">
            <Circle
              cx={100}
              cy={100}
              r={90}
              fill="none"
              stroke={colors.creamStroke}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="430 135"
            />
          </Svg>
        </Animated.View>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoEntrance,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            accessible={false}
            contentFit="contain"
            source={chiRhoIcon}
            style={styles.logo}
            tintColor={colors.creamTint}
          />
        </Animated.View>
      </Animated.View>
      <Animated.Text style={[styles.label, { opacity: spinnerEntrance }]}>
        {label}
      </Animated.Text>
    </Animated.View>
  );
}
