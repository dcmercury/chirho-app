import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fonts, type ColorTokens } from "../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../theme/ThemeProvider";
import type { HomeProfile } from "../../../types/home";
import {
  InlineError,
  ToggleRow,
  useProfileStyles,
} from "./ProfileControls";

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
    hint: {
      color: colors.muted,
      fontFamily: fonts.mono,
      fontSize: 9,
      lineHeight: 14,
      marginTop: -4,
      marginBottom: 8,
    },
  });
}

function notificationLabel(item: HomeProfile["notifications"][number]) {
  return item.key === "dailyPrayerReminders"
    ? "Prayer-ready notifications"
    : item.label;
}

export function NotificationTestButton({
  label,
  testing,
  onPress,
}: {
  label: string;
  testing: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityLabel={`Send test ${label} notification`}
      accessibilityRole="button"
      accessibilityState={{ busy: testing, disabled: testing }}
      disabled={testing}
      onPress={onPress}
      style={[styles.testButton, testing && styles.disabled]}
    >
      {testing ? (
        <ActivityIndicator color={colors.accentText} size="small" />
      ) : (
        <Text style={styles.testText}>Test</Text>
      )}
    </Pressable>
  );
}

export function NotificationsSection({
  visible,
  notifications,
  isSuperadmin,
  isPending,
  isTestPending,
  error,
  onChange,
  onTest,
}: {
  visible: boolean;
  notifications: HomeProfile["notifications"];
  isSuperadmin: boolean;
  isPending: (key: string) => boolean;
  isTestPending: (key: string) => boolean;
  error?: string;
  onChange: (key: string, enabled: boolean) => void;
  onTest: (key: string, label: string) => void;
}) {
  const styles = useProfileStyles();
  const extraStyles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState(false);
  const items = notifications.filter((item) => !item.adminDisabled);

  useEffect(() => {
    if (!visible) setExpanded(false);
  }, [visible]);

  if (!items.length) return null;

  const enabledCount = items.filter((item) => item.enabled).length;
  const summary =
    enabledCount === 0
      ? "All off"
      : enabledCount === items.length
        ? "All on"
        : `${enabledCount} of ${items.length} on`;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notifications</Text>
      <Pressable
        accessibilityLabel={`${expanded ? "Collapse" : "Expand"} notifications`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [
          styles.accountSummaryToggle,
          pressed && styles.accountSummaryPressed,
        ]}
      >
        <Text style={styles.accountSummaryName}>{summary}</Text>
        <View
          style={[
            styles.accountCaret,
            expanded && styles.accountCaretExpanded,
          ]}
        />
      </Pressable>
      {expanded
        ? items.map((item) => {
            const label = notificationLabel(item);
            return (
              <View key={item.key}>
                <ToggleRow
                  accessory={
                    isSuperadmin ? (
                      <NotificationTestButton
                        label={label}
                        onPress={() => onTest(item.key, label)}
                        testing={isTestPending(item.key)}
                      />
                    ) : null
                  }
                  disabled={isPending(item.key) || item.adminDisabled}
                  label={label}
                  onValueChange={(enabled) => onChange(item.key, enabled)}
                  value={item.enabled}
                />
                {item.key === "dailyPrayerReminders" ? (
                  <Text style={extraStyles.hint}>
                    Get a push alert when an enabled prayer is ready.
                  </Text>
                ) : null}
              </View>
            );
          })
        : null}
      {expanded ? <InlineError message={error} /> : null}
    </View>
  );
}
