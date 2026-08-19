import { Pressable, Text, View } from "react-native";
import type { HomeProfile } from "../../../types/home";
import { styles } from "./ProfileControls";

export function ProfileHeader({
  profile,
  onClose,
}: {
  profile: HomeProfile;
  onClose: () => void;
}) {
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
        {profile.stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </>
  );
}
