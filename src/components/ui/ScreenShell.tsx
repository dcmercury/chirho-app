import { type ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { VideoView, type VideoPlayer } from "expo-video";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
} from "react-native-reanimated";
import { type ColorTokens } from "../../theme/tokens";
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
        <VideoView
          player={player}
          style={[styles.video, videoFaded && styles.videoFaded]}
          contentFit="cover"
          nativeControls={false}
        />
      ) : null}

      <GridOverlay />
      <View style={styles.blurOrb} pointerEvents="none" />

      <Animated.View
        entering={FadeIn.duration(800)
          .delay(300)
          .easing(Easing.bezier(0.22, 1, 0.36, 1))
          .reduceMotion(ReduceMotion.System)}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: overlayAt(overlayOpacity) },
        ]}
        pointerEvents="none"
      />

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
    videoFaded: {
      opacity: 0,
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
