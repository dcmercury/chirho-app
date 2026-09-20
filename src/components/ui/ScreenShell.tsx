import { type ReactNode, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { VideoView, type VideoPlayer } from "expo-video";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { motion, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { GridOverlay } from "./GridOverlay";
import type { ImageSource } from "expo-image";

export function ScreenShell({
  background,
  nextBackground,
  overlayOpacity,
  player,
  videoVisible,
  videoFaded,
  header,
  children,
  footer,
}: {
  background: ImageSource;
  nextBackground?: ImageSource | null;
  overlayOpacity: number;
  player?: VideoPlayer | null;
  videoVisible?: boolean;
  videoFaded?: boolean;
  header?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { overlayAt } = useTheme();
  const styles = useThemedStyles(createStyles);
  const reducedMotion = useReducedMotion();
  const crossfade = useSharedValue(videoVisible && videoFaded ? 1 : 0);

  useEffect(() => {
    if (!videoVisible || !videoFaded) {
      crossfade.value = 0;
      return;
    }
    crossfade.value = withTiming(1, {
      duration: reducedMotion ? 0 : motion.videoFade,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [crossfade, reducedMotion, videoFaded, videoVisible]);

  const videoStyle = useAnimatedStyle(() => ({
    opacity: 1 - crossfade.value,
  }));
  const stillStyle = useAnimatedStyle(() => ({
    opacity: crossfade.value,
  }));

  return (
    <View style={styles.slide}>
      <Image source={background} style={StyleSheet.absoluteFill} contentFit="cover" />
      {nextBackground ? (
        <Animated.View
          entering={FadeIn.duration(500)
            .easing(Easing.bezier(0.22, 1, 0.36, 1))
            .reduceMotion(ReduceMotion.System)}
          style={StyleSheet.absoluteFill}
        >
          <Image
            source={nextBackground}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </Animated.View>
      ) : null}

      {videoVisible && player ? (
        <Animated.View pointerEvents="none" style={[styles.video, videoStyle]}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        </Animated.View>
      ) : null}

      {videoVisible ? (
        <Animated.View pointerEvents="none" style={[styles.videoStill, stillStyle]}>
          <Image
            source={background}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </Animated.View>
      ) : null}

      <View style={styles.mediaFx} pointerEvents="none">
        <GridOverlay />
        <View style={styles.blurOrb} />
        <Animated.View
          entering={FadeIn.duration(800)
            .delay(300)
            .easing(Easing.bezier(0.22, 1, 0.36, 1))
            .reduceMotion(ReduceMotion.System)}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: overlayAt(overlayOpacity) },
          ]}
        />
      </View>

      {header ? (
        <View
          pointerEvents="box-none"
          style={[styles.header, { top: insets.top + 8 }]}
        >
          {header}
        </View>
      ) : null}

      <View style={styles.content}>
        <View style={styles.body}>{children}</View>
        {footer}
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    slide: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    video: {
      ...StyleSheet.absoluteFill,
      zIndex: 2,
    },
    videoStill: {
      ...StyleSheet.absoluteFill,
      zIndex: 3,
    },
    mediaFx: {
      ...StyleSheet.absoluteFill,
      zIndex: 4,
    },
    header: {
      position: "absolute",
      right: 24,
      zIndex: 30,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
      zIndex: 20,
      justifyContent: "space-between",
    },
    body: {
      flex: 1,
      justifyContent: "flex-end",
      marginBottom: 32,
    },
    blurOrb: {
      position: "absolute",
      bottom: -160,
      right: -160,
      width: 384,
      height: 384,
      borderRadius: 192,
      backgroundColor: colors.blurOrb,
      opacity: 0.4,
    },
  });
}
