import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { colors, fonts } from "../../../theme/tokens";
import type { HomeProfile } from "../../../types/home";
import { InlineError, Section, ToggleRow } from "./ProfileControls";

export function NotificationsSection({
  notifications,
  isSuperadmin,
  isPending,
  isTestPending,
  error,
  onChange,
  onTest,
}: {
  notifications: HomeProfile["notifications"];
  isSuperadmin: boolean;
  isPending: (key: string) => boolean;
  isTestPending: (key: string) => boolean;
  error?: string;
  onChange: (key: string, enabled: boolean) => void;
  onTest: (key: string, label: string) => void;
}) {
  if (!notifications.length) return null;
  return (
    <Section title="Notifications">
      {notifications.map((item) => {
        const testing = isTestPending(item.key);
        return (
          <ToggleRow
            key={item.key}
            accessory={
              isSuperadmin ? (
                <Pressable
                  accessibilityLabel={`Send test ${item.label} notification`}
                  accessibilityRole="button"
                  accessibilityState={{ busy: testing, disabled: testing }}
                  disabled={testing}
                  onPress={() => onTest(item.key, item.label)}
                  style={[styles.testButton, testing && styles.disabled]}
                >
                  {testing ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <Text style={styles.testText}>Test</Text>
                  )}
                </Pressable>
              ) : null
            }
            disabled={isPending(item.key) || item.adminDisabled}
            label={item.label}
            onValueChange={(enabled) => onChange(item.key, enabled)}
            value={item.enabled}
          />
        );
      })}
      <InlineError message={error} />
    </Section>
  );
}

const styles = StyleSheet.create({
  testButton: {
    minWidth: 48,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassBorderStrong,
    paddingHorizontal: 11,
  },
  testText: {
    color: colors.accent,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
  },
  disabled: { opacity: 0.45 },
});
