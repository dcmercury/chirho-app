import { Pressable, Text, StyleSheet, View } from "react-native";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";
import type { LovedOnePhoto } from "../../types/home";
import { KenBurnsImage, lovedOneImagePaths } from "./KenBurnsImage";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    item: {
      width: 90,
      alignItems: "center",
      gap: 8,
    },
    itemCompact: {
      width: 64,
    },
    pressed: {
      opacity: 0.65,
      transform: [{ scale: 0.96 }],
    },
    avatarRing: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: "hidden",
    },
    name: {
      fontFamily: fonts.displayMedium,
      fontSize: 12,
      fontWeight: "500",
      color: colors.title,
      textAlign: "center",
    },
    intention: {
      fontSize: 9.6,
      color: colors.muted,
      textAlign: "center",
      lineHeight: 12.5,
      fontFamily: fonts.body,
    },
  });
}

export function LovedOne({
  person,
  showIntention = true,
  compact = false,
  onPress,
  onLongPress,
}: {
  person: {
    id?: string;
    name: string;
    avatar: string;
    intention: string;
    primaryPhoto?: LovedOnePhoto | null;
    photos?: LovedOnePhoto[];
    backgroundImage?: string;
  };
  showIntention?: boolean;
  compact?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const imagePaths = lovedOneImagePaths(person);
  return (
    <Pressable
      accessibilityRole={onPress || onLongPress ? "button" : undefined}
      accessibilityHint={onLongPress ? "Long press to edit prayer reasons" : undefined}
      accessibilityLabel={onPress ? `Pray for ${person.name}` : undefined}
      disabled={!onPress && !onLongPress}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        compact && styles.itemCompact,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.avatarRing}>
        <KenBurnsImage
          paths={imagePaths}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {person.name}
      </Text>
      {showIntention ? (
        <Text style={styles.intention} numberOfLines={2}>
          {person.intention}
        </Text>
      ) : null}
    </Pressable>
  );
}
