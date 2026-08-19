import { Pressable, Text } from "react-native";
import { Action, InlineError, styles } from "./ProfileControls";

export function DangerZoneSection({
  signOutPending,
  deletePending,
  error,
  onSignOut,
  onDeleteAccount,
}: {
  signOutPending: boolean;
  deletePending: boolean;
  error?: string;
  onSignOut: () => void;
  onDeleteAccount: () => void;
}) {
  return (
    <>
      <Action
        disabled={signOutPending}
        label="Sign out"
        onPress={onSignOut}
      />
      <Pressable
        accessibilityLabel="Delete account"
        accessibilityRole="button"
        accessibilityState={{ disabled: deletePending }}
        disabled={deletePending}
        onPress={onDeleteAccount}
        style={[styles.deleteButton, deletePending && styles.disabled]}
      >
        <Text style={styles.deleteText}>Delete account</Text>
      </Pressable>
      <InlineError message={error} />
    </>
  );
}
