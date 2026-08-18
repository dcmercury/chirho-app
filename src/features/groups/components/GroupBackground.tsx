import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
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
import { GridOverlay } from "../../../components/ui/GridOverlay";
import { images, resolveImage } from "../../../lib/assets";

export function GroupBackground({ uri }: { uri: string | null }) {
  const [readyUri, setReadyUri] = useState<string | null>(null);
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let active = true;
    if (!uri || !/^https?:\/\//.test(uri)) {
      setReadyUri(uri);
      return () => {
        active = false;
      };
    }
    Image.prefetch(uri)
      .catch(() => false)
      .finally(() => {
        if (active) setReadyUri(uri);
      });
    return () => {
      active = false;
    };
  }, [uri]);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, {
        duration: 20_000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.1]) },
      { translateX: interpolate(progress.value, [0, 1], [0, -14]) },
      { translateY: interpolate(progress.value, [0, 1], [0, -8]) },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <Image
          source={readyUri ? resolveImage(readyUri) : images.intro}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={1_200}
        />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      <GridOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: "rgba(0,0,0,0.75)" },
});
