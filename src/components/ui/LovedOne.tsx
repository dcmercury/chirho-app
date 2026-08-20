import { Pressable, Text, StyleSheet } from "react-native";
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
      width: 72,
    },
    pressed: {
      opacity: 0.65,
      transform: [{ scale: 0.96 }],
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: colors.glassBorderRow,
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
}) {
  const styles = useThemedStyles(createStyles);
  const imagePaths = lovedOneImagePaths(person);
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `Pray for ${person.name}` : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        compact && styles.itemCompact,
        pressed && styles.pressed,
      ]}
    >
      <KenBurnsImage
        paths={imagePaths}
        style={styles.avatar}
      />
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
