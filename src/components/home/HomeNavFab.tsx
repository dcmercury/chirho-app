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
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { fonts } from "../../theme/tokens";
import { ChiRhoMark } from "../ui/ChiRhoMark";

export const HOME_NAV_FAB_SIZE = 76;
const LABEL_SPACE = 18;
const MARK_W = 38;
const MARK_H = 50;
const GLOW_COLORS = ["#f97316", "#ffffff"];
const GLOW_SIZE = 126;
const GLOW_BLOOM = (GLOW_SIZE - HOME_NAV_FAB_SIZE) / 2;

export const HOME_NAV_FAB_RESERVE =
  HOME_NAV_FAB_SIZE + LABEL_SPACE + 16 + GLOW_BLOOM;

type Blob = {
  color: string;
  cx: number;
  cy: number;
  r: number;
};

// Uneven placement so the mix reads as light, not a concentric ring.
const BLOBS: Blob[] = [
  { color: GLOW_COLORS[0], cx: 58, cy: 56, r: 42 },
  { color: GLOW_COLORS[1], cx: 72, cy: 61, r: 38 },
  { color: GLOW_COLORS[0], cx: 68, cy: 72, r: 40 },
];

function GlowAura() {
  const mid = GLOW_SIZE / 2;
  return (
    <Svg height={GLOW_SIZE} width={GLOW_SIZE}>
      <Defs>
        {BLOBS.map((blob, index) => (
          <RadialGradient
            key={`grad-${index}`}
            cx="50%"
            cy="50%"
            fx="50%"
            fy="50%"
            id={`prayBlob${index}`}
            rx="50%"
            ry="50%"
          >
            <Stop offset="0" stopColor={blob.color} stopOpacity="0.55" />
            <Stop offset="0.4" stopColor={blob.color} stopOpacity="0.22" />
            <Stop offset="1" stopColor={blob.color} stopOpacity="0" />
          </RadialGradient>
        ))}
        <RadialGradient
          cx="50%"
          cy="50%"
          fx="50%"
          fy="50%"
          id="prayBloom"
          rx="50%"
          ry="50%"
        >
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <Stop offset="0.5" stopColor="#f97316" stopOpacity="0.12" />
          <Stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={mid} cy={mid} fill="url(#prayBloom)" r={mid} />
      {BLOBS.map((blob, index) => (
        <Circle
          key={`blob-${index}`}
          cx={blob.cx}
          cy={blob.cy}
          fill={`url(#prayBlob${index})`}
          r={blob.r}
        />
      ))}
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
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      rotation.value = 0;
      pulse.value = 1;
      return;
    }
    rotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withTiming(1.04, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse, reducedMotion, rotation]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: pulse.value }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View style={styles.orbStack}>
        <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]}>
          <GlowAura />
        </Animated.View>
        <Pressable
          accessibilityLabel="Add someone or something to pray for"
          accessibilityRole="button"
          onPress={onPress}
          style={styles.orb}
        >
          <View style={styles.orbFace}>
            <ChiRhoMark width={MARK_W} height={MARK_H} color="#FFFFFF" />
          </View>
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
  glow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
  },
  orb: {
    width: HOME_NAV_FAB_SIZE,
    height: HOME_NAV_FAB_SIZE,
    borderRadius: HOME_NAV_FAB_SIZE / 2,
    backgroundColor: "#000000",
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  orbFace: {
    flex: 1,
    alignSelf: "stretch",
    borderRadius: (HOME_NAV_FAB_SIZE - 10) / 2,
    backgroundColor: "#000000",
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
