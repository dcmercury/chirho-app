import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";
import { StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";

export function GridOverlay() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="grid" width={24} height={24} patternUnits="userSpaceOnUse">
          <Circle cx={1} cy={1} r={1} fill={colors.grid} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#grid)" opacity={0.2} />
    </Svg>
  );
}
