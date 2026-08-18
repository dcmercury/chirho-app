import { Pressable, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { colors, fonts } from "../../theme/tokens";
import { resolveImage } from "../../lib/assets";

export function LovedOne({
  person,
  showIntention = true,
  onPress,
}: {
  person: {
    id?: string;
    name: string;
    avatar: string;
    intention: string;
  };
  showIntention?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `Pray for ${person.name}` : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <Image
        source={resolveImage(person.avatar)}
        style={styles.avatar}
        contentFit="cover"
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

const styles = StyleSheet.create({
  item: {
    width: 90,
    alignItems: "center",
    gap: 8,
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
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  name: {
    fontFamily: fonts.displayMedium,
    fontSize: 12,
    fontWeight: "500",
    color: colors.white,
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
