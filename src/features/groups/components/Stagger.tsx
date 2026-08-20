import type { PropsWithChildren } from "react";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  ReduceMotion,
} from "react-native-reanimated";

export function Stagger({
  children,
  delay,
  direction = "down",
}: PropsWithChildren<{ delay: number; direction?: "down" | "up" }>) {
  const entering = (direction === "up" ? FadeInUp : FadeInDown)
    .duration(500)
    .delay(delay)
    .easing(Easing.bezier(0.22, 1, 0.36, 1))
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: direction === "up" ? -16 : 16 }],
    })
    .reduceMotion(ReduceMotion.System);

  return <Animated.View entering={entering}>{children}</Animated.View>;
}
