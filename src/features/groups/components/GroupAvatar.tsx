import { Image } from "expo-image";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { resolveImage } from "../../../lib/assets";
import { colors, fonts } from "../../../theme/tokens";

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
  borderColor = colors.white,
  style,
}: GroupAvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor,
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

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  initial: {
    color: colors.mutedStrong,
    fontFamily: fonts.bodyMedium,
  },
});
