import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
} from "react-native-reanimated";
import { GridOverlay } from "../../components/ui/GridOverlay";
import { API_BASE, resolveImage } from "../../lib/assets";
import { type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";

export function InviteBackground({
  backgroundImage,
}: {
  backgroundImage?: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const source = backgroundImage
    ? resolveImage(backgroundImage)
    : { uri: `${API_BASE}/church.jpg` };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        entering={FadeIn.duration(1_200)
          .easing(Easing.out(Easing.quad))
          .reduceMotion(ReduceMotion.System)}
        style={styles.imageWrap}
      >
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      <View style={styles.bottomShade} />
      <GridOverlay />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    imageWrap: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      transform: [{ scale: 1.03 }],
    },
    overlay: {
      backgroundColor: colors.overlayInvite,
    },
    bottomShade: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "48%",
      backgroundColor: colors.overlayInviteShade,
    },
  });
}
