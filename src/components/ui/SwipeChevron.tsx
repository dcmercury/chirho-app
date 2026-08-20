import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";

interface SwipeChevronProps {
  direction: "up" | "down";
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  loading?: boolean;
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    button: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.overlayControl,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    pressed: {
      backgroundColor: colors.accentFillActive,
      borderColor: colors.accentBorderChevron,
    },
    disabled: {
      opacity: 0.3,
    },
  });
}

export function SwipeChevron({
  direction,
  onPress,
  accessibilityLabel,
  disabled = false,
  loading = false,
}: SwipeChevronProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || disabled || loading) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, {
        duration: 850,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [disabled, loading, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.45, 0.95]),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [direction === "up" ? 3 : -3, direction === "up" ? -3 : 3],
        ),
      },
    ],
  }));

  return (
    <Pressable
      accessibilityLabel={
        accessibilityLabel ||
        (direction === "up"
          ? "Next prayer, swipe up"
          : "Previous prayer, swipe down")
      }
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <Animated.View style={animatedStyle}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d={direction === "up" ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"}
              stroke={colors.white}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      )}
    </Pressable>
  );
}
