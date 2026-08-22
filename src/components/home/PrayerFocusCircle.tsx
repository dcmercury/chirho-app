import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import type { PrayerFocus } from "../../types/home";
import { AuthenticatedImage } from "../ui/AuthenticatedImage";
import { PrayerFocusTypeIcon } from "./PrayerFocusTypeIcon";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    item: {
      width: 64,
      alignItems: "center",
      gap: 8,
    },
    pressed: {
      opacity: 0.65,
      transform: [{ scale: 0.96 }],
    },
    ring: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.cardFill,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    name: {
      fontFamily: fonts.displayMedium,
      fontSize: 12,
      fontWeight: "500",
      color: colors.title,
      textAlign: "center",
    },
  });
}

export function PrayerFocusCircle({
  focus,
  photoPath,
  onPress,
  onLongPress,
}: {
  focus: PrayerFocus;
  photoPath?: string | null;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityHint="Long press to edit"
      accessibilityLabel={`Pray for ${focus.title}`}
      accessibilityRole="button"
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View style={styles.ring}>
        {photoPath ? (
          <AuthenticatedImage
            contentFit="cover"
            path={photoPath}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <PrayerFocusTypeIcon
            type={focus.type}
            color={colors.accent}
            size={22}
          />
        )}
      </View>
      <Text numberOfLines={1} style={styles.name}>
        {focus.title}
      </Text>
    </Pressable>
  );
}
