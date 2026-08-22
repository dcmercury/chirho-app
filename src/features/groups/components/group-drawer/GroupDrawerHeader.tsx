import { Pressable, Text, View } from "react-native";
import { useGroupDrawerStyles } from "./GroupDrawerControls";

interface GroupDrawerHeaderProps {
  groupName: string;
  memberCount?: number;
  subtitle?: string;
  closeLabel?: string;
  onClose: () => void;
}

export function GroupDrawerHeader({
  groupName,
  memberCount,
  subtitle,
  closeLabel = "Close group members drawer",
  onClose,
}: GroupDrawerHeaderProps) {
  const styles = useGroupDrawerStyles();
  const line =
    subtitle ??
    (memberCount === undefined
      ? undefined
      : `${memberCount} ${memberCount === 1 ? "member" : "members"}`);
  return (
    <>
      <Pressable
        accessibilityLabel={closeLabel}
        accessibilityRole="button"
        hitSlop={20}
        onPress={onClose}
        style={styles.handle}
      />
      <Text style={styles.title}>{groupName}</Text>
      {line ? <Text style={styles.subtitle}>{line}</Text> : null}
      <View style={styles.headerRule} />
    </>
  );
}
