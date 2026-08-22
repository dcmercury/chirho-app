import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { fonts } from "../../theme/tokens";
import { ChiRhoMark } from "../ui/ChiRhoMark";

export const HOME_NAV_FAB_SIZE = 64;
const LABEL_SPACE = 18;
const MARK_W = 38;
const MARK_H = 50;
const GLOW_COLORS = ["#FF5733", "#33FF57", "#3357FF", "#F1C40F"];
const GLOW_SOFT = 92;
const GLOW_CORE = 78;

export const HOME_NAV_FAB_RESERVE = HOME_NAV_FAB_SIZE + LABEL_SPACE + 16;

function GlowDisc({
  size,
  opacity,
  gradId,
}: {
  size: number;
  opacity: number;
  gradId: string;
}) {
  const radius = size / 2;
  return (
    <Svg height={size} width={size}>
      <Defs>
        <LinearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
          {[
            ...GLOW_COLORS.map((color, index) => (
              <Stop
                key={`${gradId}-${color}`}
                offset={index / GLOW_COLORS.length}
                stopColor={color}
              />
            )),
            // Repeats the first color so the sweep closes without a seam.
            <Stop key={`${gradId}-loop`} offset="1" stopColor={GLOW_COLORS[0]} />,
          ]}
        </LinearGradient>
      </Defs>
      <Circle
        cx={radius}
        cy={radius}
        fill={`url(#${gradId})`}
        opacity={opacity}
        r={radius}
      />
    </Svg>
  );
}

export function HomeNavFab({
  bottom,
  onPress,
}: {
  bottom: number;
  onPress?: () => void;
}) {
  const reducedMotion = Boolean(useReducedMotion());
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      rotation.value = 0;
      return;
    }
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [reducedMotion, rotation]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: 0.9 }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View style={styles.orbStack}>
        <Animated.View
          pointerEvents="none"
          style={[styles.glowLayer, styles.glowSoft, glowStyle]}
        >
          <GlowDisc gradId="prayGlowSoft" opacity={0.32} size={GLOW_SOFT} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.glowLayer, styles.glowCore, glowStyle]}
        >
          <GlowDisc gradId="prayGlowCore" opacity={0.88} size={GLOW_CORE} />
        </Animated.View>
        <Pressable
          accessibilityLabel="Add someone or something to pray for"
          accessibilityRole="button"
          onPress={onPress}
          style={styles.orb}
        >
          <ChiRhoMark width={MARK_W} height={MARK_H} color="#FFFFFF" />
        </Pressable>
      </View>
      <Text numberOfLines={1} style={styles.label}>
        pray
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 40,
  },
  orbStack: {
    width: HOME_NAV_FAB_SIZE,
    height: HOME_NAV_FAB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  glowLayer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  glowSoft: {
    width: GLOW_SOFT,
    height: GLOW_SOFT,
  },
  glowCore: {
    width: GLOW_CORE,
    height: GLOW_CORE,
  },
  orb: {
    width: HOME_NAV_FAB_SIZE,
    height: HOME_NAV_FAB_SIZE,
    borderRadius: HOME_NAV_FAB_SIZE / 2,
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "rgba(255, 242, 242, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 4,
    color: "#FFFFFF",
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    textAlign: "center",
    textTransform: "uppercase",
  },
});
