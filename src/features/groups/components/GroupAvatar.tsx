import { Image } from "expo-image";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { resolveImage } from "../../../lib/assets";
import { fonts, type ColorTokens } from "../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../theme/ThemeProvider";

interface GroupAvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  borderColor?: string;
  style?: ViewStyle;
}

export function GroupAvatar({
  uri,
  name,
  size = 36,
  borderColor,
  style,
}: GroupAvatarProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const resolvedBorder = borderColor ?? colors.white;
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: resolvedBorder,
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={resolveImage(uri)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={250}
        />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.32 }]}>
          {(name?.trim().charAt(0) || "?").toUpperCase()}
        </Text>
      )}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    avatar: {
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 2,
      backgroundColor: colors.glassFillStrong,
    },
    initial: {
      color: colors.mutedStrong,
      fontFamily: fonts.bodyMedium,
    },
  });
}
