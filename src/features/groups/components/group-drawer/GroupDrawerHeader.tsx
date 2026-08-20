import { Pressable, Text, View } from "react-native";
import { useGroupDrawerStyles } from "./GroupDrawerControls";

interface GroupDrawerHeaderProps {
  groupName: string;
  memberCount: number;
  onClose: () => void;
}

export function GroupDrawerHeader({
  groupName,
  memberCount,
  onClose,
}: GroupDrawerHeaderProps) {
  const styles = useGroupDrawerStyles();
  return (
    <>
      <Pressable
        accessibilityLabel="Close group members drawer"
        accessibilityRole="button"
        hitSlop={20}
        onPress={onClose}
        style={styles.handle}
      />
      <Text style={styles.title}>{groupName}</Text>
      <Text style={styles.subtitle}>
        {memberCount} {memberCount === 1 ? "member" : "members"}
      </Text>
      <View style={styles.headerRule} />
    </>
  );
}
