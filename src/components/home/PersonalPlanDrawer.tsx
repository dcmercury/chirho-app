import { BlurView } from "expo-blur";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import {
  formatTrialRemaining,
  type PersonalPlan,
} from "../../types/home";

const OFFSCREEN = Dimensions.get("window").height;
const OPEN_SPRING = { damping: 26, stiffness: 260, mass: 0.85 };
const CLOSE_MS = 280;

export function PersonalPlanDrawer({
  visible,
  plan,
  pending,
  error,
  onClose,
  onStartTrial,
  onSubscribePlaceholder,
}: {
  visible: boolean;
  plan: PersonalPlan | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onStartTrial: () => Promise<void>;
  onSubscribePlaceholder: () => Promise<void>;
}) {
  const styles = useThemedStyles(createStyles);
  const { appearance } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [presented, setPresented] = useState(false);
  const [, setTick] = useState(0);
  const overlay = useSharedValue(0);
  const translateY = useSharedValue(OFFSCREEN);
  const sheetHeight = useSharedValue(OFFSCREEN);
  const closing = useSharedValue(false);

  const hidePresented = useCallback(() => {
    setPresented(false);
  }, []);

  const openSheet = useCallback(() => {
    closing.value = false;
    if (reduceMotion) {
      overlay.value = 1;
      translateY.value = 0;
      return;
    }
    overlay.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
    translateY.value = withSpring(0, OPEN_SPRING);
  }, [closing, overlay, reduceMotion, translateY]);

  const closeSheet = useCallback(() => {
    closing.value = true;
    const distance = Math.max(sheetHeight.value, 1);
    if (reduceMotion) {
      overlay.value = 0;
      translateY.value = distance;
      hidePresented();
      return;
    }
    overlay.value = withTiming(0, {
      duration: CLOSE_MS,
      easing: Easing.in(Easing.cubic),
    });
    translateY.value = withTiming(
      distance,
      { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished && closing.value) runOnJS(hidePresented)();
      },
    );
  }, [closing, hidePresented, overlay, reduceMotion, sheetHeight, translateY]);

  useEffect(() => {
    if (visible) {
      overlay.value = 0;
      translateY.value = OFFSCREEN;
      setPresented(true);
      return;
    }
    if (presented) closeSheet();
    // Intentionally react to `visible` only so a closing animation is not restarted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useLayoutEffect(() => {
    if (visible && presented) openSheet();
  }, [openSheet, presented, visible]);

  useEffect(() => {
    if (!visible || plan?.status !== "trial") return;
    const id = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [plan?.status, visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(12)
        .failOffsetX([-28, 28])
        .onChange((event) => {
          const next = Math.max(0, event.translationY);
          translateY.value = next;
          overlay.value = interpolate(
            next,
            [0, Math.max(sheetHeight.value, 1)],
            [1, 0],
            Extrapolation.CLAMP,
          );
        })
        .onEnd((event) => {
          const shouldClose = event.translationY > 72 || event.velocityY > 900;
          if (shouldClose) {
            runOnJS(onClose)();
            return;
          }
          overlay.value = withTiming(1, { duration: 200 });
          translateY.value = withSpring(0, OPEN_SPRING);
        }),
    [onClose, overlay, sheetHeight, translateY],
  );

  const remaining = formatTrialRemaining(plan?.trialEndsAt);
  const complimentary = plan?.complimentaryAccess === true;
  const title =
    complimentary
      ? "Included during launch"
      : plan?.status === "sponsored"
      ? "Covered by your church"
      : plan?.status === "pro"
        ? "ChiRho Personal"
        : plan?.status === "trial"
          ? "Your free week"
          : "Keep your prayer cards";
  const body =
    complimentary
      ? "Prayer cards, loved ones, daily decks, and prayer focuses are included at no cost in this release."
      : plan?.status === "sponsored"
      ? `${plan.sponsoredByName || "Your church"} includes ChiRho Personal while you are a member.`
      : plan?.status === "pro"
        ? "Your ChiRho Personal access is active."
        : plan?.status === "trial"
          ? remaining || "Your free week is active."
          : plan?.canStartTrial
            ? "Your church no longer covers ChiRho Personal. Start a free week, or continue on your own."
            : "Your free week has ended. Continue with Pro to keep loved ones, daily cards, and focuses.";

  return (
    <Modal
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={presented}
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.stage} pointerEvents="box-none">
          <Animated.View
            pointerEvents={presented ? "auto" : "none"}
            style={[styles.backdrop, overlayStyle]}
          >
            <BlurView
              intensity={appearance === "light" ? 42 : 38}
              tint={appearance === "light" ? "light" : "dark"}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor:
                    appearance === "light"
                      ? "rgba(28, 25, 23, 0.36)"
                      : "rgba(0, 0, 0, 0.55)",
                },
              ]}
            />
            <Pressable
              accessibilityLabel="Dismiss ChiRho Personal"
              accessibilityRole="button"
              onPress={onClose}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <GestureDetector gesture={pan}>
            <Animated.View
              onLayout={(event) => {
                sheetHeight.value = event.nativeEvent.layout.height;
              }}
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, 16) },
                sheetStyle,
              ]}
            >
              <View style={styles.handle} />
              <Text style={styles.eyebrow}>CHIRHO PERSONAL</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.body}>{body}</Text>
              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}

            {!complimentary && plan?.canStartTrial ? (
              <Pressable
                accessibilityRole="button"
                disabled={pending}
                onPress={() => {
                  void onStartTrial();
                }}
                style={[styles.submit, pending && styles.disabled]}
              >
                <Text style={styles.submitText}>
                  {pending ? "Starting…" : "Start 7-day free trial"}
                </Text>
              </Pressable>
            ) : null}

            {!complimentary &&
            plan &&
            plan.status !== "sponsored" &&
            plan.status !== "pro" ? (
              <Pressable
                accessibilityRole="button"
                disabled={pending}
                onPress={() => {
                  void onSubscribePlaceholder();
                }}
                style={[
                  plan.canStartTrial ? styles.secondary : styles.submit,
                  pending && styles.disabled,
                ]}
              >
                <Text
                  style={
                    plan.canStartTrial ? styles.secondaryText : styles.submitText
                  }
                >
                  {pending
                    ? "Updating…"
                    : `Continue with Pro · ${plan.priceLabel}`}
                </Text>
              </Pressable>
            ) : null}

            {complimentary ||
            plan?.status === "pro" ||
            plan?.status === "sponsored" ? (
              <Pressable
                accessibilityRole="button"
                disabled={pending}
                onPress={onClose}
                style={styles.submit}
              >
                <Text style={styles.submitText}>Done</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={pending}
                onPress={onClose}
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>Stay on Free</Text>
              </Pressable>
            )}

            <Text style={styles.footnote}>
              {complimentary
                ? "All ChiRho Personal features are included during launch."
                : "Manage your ChiRho Personal access from this screen."}
            </Text>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    stage: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    sheet: {
      backgroundColor: colors.canvas,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 24,
      paddingTop: 10,
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.glassBorderStrong,
      marginBottom: 18,
    },
    eyebrow: {
      color: colors.accentText,
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      letterSpacing: 1,
      marginBottom: 8,
    },
    title: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 28,
      letterSpacing: -0.6,
      marginBottom: 10,
    },
    body: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 20,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 13,
      marginBottom: 16,
    },
    submit: {
      width: "100%",
      paddingVertical: 14,
      backgroundColor: colors.buttonPrimary,
      borderRadius: 18,
      alignItems: "center",
      marginBottom: 10,
    },
    submitText: {
      color: colors.buttonOnPrimary,
      fontFamily: fonts.displayMedium,
      fontSize: 14,
    },
    secondary: {
      width: "100%",
      paddingVertical: 14,
      borderRadius: 18,
      alignItems: "center",
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.glassBorderStrong,
    },
    secondaryText: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 14,
    },
    cancel: {
      alignItems: "center",
      paddingVertical: 10,
    },
    cancelText: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 14,
    },
    disabled: { opacity: 0.4 },
    footnote: {
      color: colors.mutedSoft,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 12,
    },
  });
}
