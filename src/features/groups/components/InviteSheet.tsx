import { useEffect } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ColorTokens } from "../../../theme/tokens";
import { useThemedStyles } from "../../../theme/ThemeProvider";
import type { PrayerGroup, TokenProvider } from "../types";
import { InviteSection } from "./group-drawer/InviteSection";

export function InviteSheet({
  visible,
  group,
  tokenProvider,
  onClose,
  onChanged,
}: {
  visible: boolean;
  group: PrayerGroup;
  tokenProvider: TokenProvider;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) translateY.value = 0;
  }, [translateY, visible]);

  const dismissGesture = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 80 || event.velocityY > 850) {
        translateY.value = withTiming(500, { duration: 180 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
        return;
      }
      translateY.value = withSpring(0, {
        damping: 22,
        stiffness: 240,
      });
    });
  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <Pressable
          accessibilityLabel="Close invite"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 16) },
              animatedSheetStyle,
            ]}
          >
            <GestureDetector gesture={dismissGesture}>
              <Pressable
                accessibilityHint="Swipe down or double tap to close"
                accessibilityLabel="Close invite"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.handleTouch}
              >
                <Animated.View style={styles.handle} />
              </Pressable>
            </GestureDetector>
            <InviteSection
              compact
              groupName={group.name}
              groupuuid={group.groupuuid}
              onChanged={onChanged}
              tokenProvider={tokenProvider}
              visible={visible}
            />
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
    },
    sheet: {
      backgroundColor: colors.canvas,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 4,
    },
    handleTouch: {
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    handle: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.mutedStrong,
    },
  });
}
