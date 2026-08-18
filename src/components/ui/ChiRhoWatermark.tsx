import { View, StyleSheet } from "react-native";
import { ChiRhoMark } from "./ChiRhoMark";

export function ChiRhoWatermark() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <ChiRhoMark width={140} height={185} color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "40%",
    marginBottom: 24,
    opacity: 0.12,
  },
});
