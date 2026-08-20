import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { fonts, type ColorTokens } from "../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../theme/ThemeProvider";
import type { HomeProfile } from "../../../types/home";
import { InlineError, Section, ToggleRow } from "./ProfileControls";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
      color: colors.accentText,
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
    },
    disabled: { opacity: 0.45 },
  });
}

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
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const visible = notifications.filter((item) => !item.adminDisabled);
  if (!visible.length) return null;
  return (
    <Section title="Notifications">
      {visible.map((item) => {
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
                    <ActivityIndicator color={colors.accentText} size="small" />
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
