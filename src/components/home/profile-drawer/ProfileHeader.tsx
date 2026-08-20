import { Pressable, Text, View } from "react-native";
import type { HomeProfile } from "../../../types/home";
import { useProfileStyles } from "./ProfileControls";

export function ProfileHeader({
  profile,
  onClose,
  onOpenPrayerCards,
}: {
  profile: HomeProfile;
  onClose: () => void;
  onOpenPrayerCards?: () => void;
}) {
  const styles = useProfileStyles();
  return (
    <>
      <Pressable
        accessibilityLabel="Close profile drawer"
        accessibilityRole="button"
        hitSlop={20}
        onPress={onClose}
        style={styles.handle}
      />
      <Text style={styles.name}>{profile.name}</Text>
      <Text style={styles.memberSince}>{profile.memberSince}</Text>
      <View style={styles.stats}>
        {profile.stats.map((stat) => {
          const opensPrayerCards =
            Boolean(onOpenPrayerCards) &&
            stat.label.toLowerCase() === "prayers";
          const content = (
            <>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </>
          );
          if (opensPrayerCards) {
            return (
              <Pressable
                key={stat.label}
                accessibilityHint="Opens your prayer cards"
                accessibilityLabel={`View ${stat.value} prayer cards`}
                accessibilityRole="button"
                onPress={() => onOpenPrayerCards?.()}
                style={({ pressed }) => [
                  styles.stat,
                  pressed && styles.statPressed,
                ]}
              >
                {content}
              </Pressable>
            );
          }
          return (
            <View key={stat.label} style={styles.stat}>
              {content}
            </View>
          );
        })}
      </View>
    </>
  );
}
