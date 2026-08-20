import { Pressable, Text } from "react-native";
import {
  GroupDrawerError,
  GroupDrawerSection,
  useGroupDrawerStyles,
} from "./GroupDrawerControls";

interface GroupActionsSectionProps {
  pending: boolean;
  error?: string;
  onLeave: () => void;
}

export function GroupActionsSection({
  pending,
  error,
  onLeave,
}: GroupActionsSectionProps) {
  const styles = useGroupDrawerStyles();
  return (
    <GroupDrawerSection title="Group actions">
      <Pressable
        accessibilityLabel="Leave group"
        accessibilityRole="button"
        accessibilityState={{ disabled: pending, busy: pending }}
        disabled={pending}
        onPress={onLeave}
        style={[styles.leaveButton, pending && styles.disabled]}
      >
        <Text style={styles.leaveText}>
          {pending ? "Leaving…" : "Leave Group"}
        </Text>
      </Pressable>
      <GroupDrawerError message={error} />
    </GroupDrawerSection>
  );
}
