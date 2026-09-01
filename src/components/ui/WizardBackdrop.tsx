import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useBackgroundLibrary } from "../../lib/backgroundLibrary";
import { type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";
import { AuthenticatedImage } from "./AuthenticatedImage";
import { GridOverlay } from "./GridOverlay";
import { KenBurnsImage, uniqueImagePaths } from "./KenBurnsImage";

const FADE_MS = 900;

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    overlay: { backgroundColor: colors.overlayGroup },
    preload: {
      position: "absolute",
      width: 1,
      height: 1,
      opacity: 0,
    },
  });
}

export function WizardBackdrop({
  paths,
}: {
  paths?: Array<string | null | undefined>;
} = {}) {
  const styles = useThemedStyles(createStyles);
  const { urls } = useBackgroundLibrary();
  const custom = uniqueImagePaths(paths);
  const first = custom[0];
  const reducedMotion = useReducedMotion();
  const fade = useSharedValue(0);
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const coverReady = Boolean(first) && readyFor === first;

  useEffect(() => {
    fade.value = withTiming(coverReady ? 1 : 0, {
      duration: reducedMotion ? 0 : FADE_MS,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [coverReady, fade, reducedMotion]);

  const customStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <KenBurnsImage paths={urls} style={StyleSheet.absoluteFill} />
      {first ? (
        <>
          <AuthenticatedImage
            accessible={false}
            onLoad={() => setReadyFor(first)}
            path={first}
            style={styles.preload}
          />
          <Animated.View style={[StyleSheet.absoluteFill, customStyle]}>
            <KenBurnsImage paths={custom} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </>
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      <GridOverlay />
    </View>
  );
}
