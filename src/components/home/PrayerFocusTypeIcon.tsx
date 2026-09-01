import Svg, { Circle, Line, Path } from "react-native-svg";
import type { PrayerFocusType } from "../../types/home";

export function PrayerFocusTypeIcon({
  type,
  color = "currentColor",
  size = 18,
}: {
  type: PrayerFocusType;
  color?: string;
  size?: number;
}) {
  if (type === "church") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 21h16M6 21V10l6-4 6 4v11M9 21v-6h6v6M12 2v6M9.5 4.5h5"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (type === "pet") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={6.5} cy={8} r={2} stroke={color} strokeWidth={1.7} />
        <Circle cx={17.5} cy={8} r={2} stroke={color} strokeWidth={1.7} />
        <Circle cx={9} cy={4.5} r={1.8} stroke={color} strokeWidth={1.7} />
        <Circle cx={15} cy={4.5} r={1.8} stroke={color} strokeWidth={1.7} />
        <Path
          d="M12 9c-3.2 0-6 3-6 6.1 0 2.3 1.7 3.9 3.8 3.9.9 0 1.5-.4 2.2-.4s1.3.4 2.2.4c2.1 0 3.8-1.6 3.8-3.9C18 12 15.2 9 12 9Z"
          stroke={color}
          strokeWidth={1.7}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (type === "country") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.7} />
        <Path
          d="M3.5 12h17M12 3.5c2.2 2.4 3.4 5.4 3.4 8.5S14.2 18.1 12 20.5c-2.2-2.4-3.4-5.4-3.4-8.5S9.8 5.9 12 3.5Z"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (type === "health") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M20.5 9.4c0 4.8-8.5 9.7-8.5 9.7S3.5 14.2 3.5 9.4A4.5 4.5 0 0 1 12 7.1a4.5 4.5 0 0 1 8.5 2.3Z"
          stroke={color}
          strokeWidth={1.7}
          strokeLinejoin="round"
        />
        <Path
          d="M8 12h2l1.2-2.2 1.6 4.3 1.1-2.1H16"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (type === "situation") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 4.2 21 19.5H3L12 4.2Z"
          stroke={color}
          strokeWidth={1.7}
          strokeLinejoin="round"
        />
        <Path
          d="M12 10.2v4.2"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
        <Circle cx={12} cy={16.8} r={1} fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.7} />
      <Line x1={12} y1={8} x2={12} y2={12} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={16} r={1} fill={color} />
    </Svg>
  );
}
