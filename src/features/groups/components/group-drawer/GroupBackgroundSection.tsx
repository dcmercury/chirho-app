import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../../../../theme/tokens";
import { SparkleIcon } from "../Icons";
import {
  GroupDrawerError,
  GroupDrawerSection,
} from "./GroupDrawerControls";

interface GroupBackgroundSectionProps {
  pending: boolean;
  error?: string;
  onRegenerate: () => void;
}

export function GroupBackgroundSection({
  pending,
  error,
  onRegenerate,
}: GroupBackgroundSectionProps) {
  return (
    <GroupDrawerSection title="Group background">
      <View style={styles.row}>
        <Text style={styles.copy}>
          Generate a new image from the group’s current purpose and scripture.
        </Text>
        <Pressable
          accessibilityLabel="Regenerate group background"
          accessibilityRole="button"
          accessibilityState={{ disabled: pending, busy: pending }}
          disabled={pending}
          onPress={onRegenerate}
          style={[styles.action, pending && styles.disabled]}
        >
          <SparkleIcon color={colors.accent} size={14} />
          <Text style={styles.actionText}>
            {pending ? "Generating…" : "Regenerate"}
          </Text>
        </Pressable>
      </View>
      <GroupDrawerError message={error} />
    </GroupDrawerSection>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
  },
  copy: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 17,
  },
  action: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  actionText: {
    color: colors.mutedStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  disabled: {
    opacity: 0.4,
  },
});
