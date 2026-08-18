import { type ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { VideoView, type VideoPlayer } from "expo-video";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
} from "react-native-reanimated";
import { colors } from "../../theme/tokens";
import { GridOverlay } from "./GridOverlay";
import type { ImageSource } from "expo-image";

export function ScreenShell({
  background,
  nextBackground,
  overlayOpacity,
  player,
  videoVisible,
  videoFaded,
  children,
  footer,
}: {
  background: ImageSource;
  nextBackground?: ImageSource | null;
  overlayOpacity: number;
  player?: VideoPlayer | null;
  videoVisible?: boolean;
  videoFaded?: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
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
          { backgroundColor: `rgba(0,0,0,${overlayOpacity})` },
        ]}
        pointerEvents="none"
      />

      <View style={styles.content}>
        <View style={styles.body}>{children}</View>
        {footer}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
