import { Pressable, StyleSheet, Text } from "react-native";
import { fonts, type ColorTokens } from "../../../../theme/tokens";
import { useThemedStyles } from "../../../../theme/ThemeProvider";
import {
  GroupDrawerError,
  GroupDrawerSection,
} from "./GroupDrawerControls";

interface GroupDangerZoneSectionProps {
  pending: boolean;
  error?: string;
  onDelete: () => void;
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    copy: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 17,
    },
    deleteButton: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.errorBorder,
    },
    deleteText: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 12,
    },
    disabled: {
      opacity: 0.4,
    },
  });
}

export function GroupDangerZoneSection({
  pending,
  error,
  onDelete,
}: GroupDangerZoneSectionProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <GroupDrawerSection title="Danger zone">
      <Text style={styles.copy}>
        Permanently delete this group and all associated data.
      </Text>
      <Pressable
        accessibilityLabel="Delete group"
        accessibilityRole="button"
        accessibilityState={{ disabled: pending, busy: pending }}
        disabled={pending}
        onPress={onDelete}
        style={[styles.deleteButton, pending && styles.disabled]}
      >
        <Text style={styles.deleteText}>
          {pending ? "Deleting…" : "Delete Group"}
        </Text>
      </Pressable>
      <GroupDrawerError message={error} />
    </GroupDrawerSection>
  );
}
