import type { PropsWithChildren } from "react";
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
} from "react-native-reanimated";

export function Stagger({
  children,
  delay,
}: PropsWithChildren<{ delay: number }>) {
  return (
    <Animated.View
      entering={FadeInDown.duration(500)
        .delay(delay)
        .easing(Easing.bezier(0.22, 1, 0.36, 1))
        .withInitialValues({
          opacity: 0,
          transform: [{ translateY: 16 }],
        })
        .reduceMotion(ReduceMotion.System)}
    >
      {children}
    </Animated.View>
  );
}
