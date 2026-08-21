import { Pressable, Text } from "react-native";
import {
  openPrivacyPolicy,
  openSupport,
  openTerms,
} from "../../ui/PrivacyPolicyLink";
import { Action, InlineError, useProfileStyles } from "./ProfileControls";

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
  const styles = useProfileStyles();
  return (
    <>
      <Pressable
        accessibilityLabel="Privacy Policy"
        accessibilityRole="link"
        onPress={() => {
          void openPrivacyPolicy();
        }}
        style={styles.deleteButton}
      >
        <Text style={styles.legalLink}>Privacy Policy</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Terms of Service"
        accessibilityRole="link"
        onPress={() => {
          void openTerms();
        }}
        style={styles.deleteButton}
      >
        <Text style={styles.legalLink}>Terms of Service</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Support"
        accessibilityRole="link"
        onPress={() => {
          void openSupport();
        }}
        style={styles.deleteButton}
      >
        <Text style={styles.legalLink}>Support</Text>
      </Pressable>
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
