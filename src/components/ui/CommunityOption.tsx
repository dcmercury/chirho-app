import { Pressable, Text, View, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fonts, radii, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: radii.glass,
      backgroundColor: colors.glassFill,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    pressed: {
      backgroundColor: colors.glassFillHover,
    },
    icon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.glassFill,
      alignItems: "center",
      justifyContent: "center",
    },
    text: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 12.8,
      fontWeight: "500",
      color: colors.title,
      fontFamily: fonts.bodyMedium,
    },
    desc: {
      fontSize: 10.4,
      color: colors.muted,
      fontFamily: fonts.body,
    },
  });
}

export function CommunityOption({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: "church" | "heart";
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        {icon === "church" ? (
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
              stroke={colors.title}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : (
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
              stroke={colors.title}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{description}</Text>
      </View>
    </Pressable>
  );
}
