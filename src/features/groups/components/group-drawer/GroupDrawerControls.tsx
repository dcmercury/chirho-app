import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, type as typography, type ColorTokens } from "../../../../theme/tokens";
import { useThemedStyles } from "../../../../theme/ThemeProvider";

export function useGroupDrawerStyles() {
  return useThemedStyles(createGroupDrawerStyles);
}

export function GroupDrawerSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const styles = useGroupDrawerStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function GroupDrawerError({ message }: { message?: string }) {
  const styles = useGroupDrawerStyles();
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  ) : null;
}

export function GroupDrawerPill({
  label,
  selected,
  disabled,
  compact,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  const styles = useGroupDrawerStyles();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.pill,
        compact && styles.pillCompact,
        selected && styles.pillSelected,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          compact && styles.pillTextCompact,
          selected && styles.pillTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createGroupDrawerStyles(colors: ColorTokens) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 64,
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorderStrong,
    marginBottom: 24,
  },
  title: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 27,
    textAlign: "center",
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: "center",
    marginTop: 3,
  },
  headerRule: {
    marginTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  loading: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: 28,
    gap: 10,
  },
  compactSection: {
    marginTop: 0,
    gap: 8,
  },
  sectionTitle: {
    ...typography.labelSm,
    color: colors.muted,
  },
  memberRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  memberAvatar: {
    marginRight: 10,
  },
  memberCopy: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    color: colors.title,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  memberMeta: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 10,
    textTransform: "capitalize",
  },
  removeButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingLeft: 12,
  },
  removeText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  empty: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    minWidth: 0,
    flex: 1,
  },
  firstNameInput: {
    flex: 0.75,
  },
  messageInput: {
    minHeight: 68,
  },
  compactInput: {
    minHeight: 34,
    borderRadius: 8,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  compactMessage: {
    minHeight: 44,
    paddingTop: 8,
  },
  methodRow: {
    flexDirection: "row",
    gap: 7,
  },
  pill: {
    minHeight: 34,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 10,
  },
  pillSelected: {
    backgroundColor: colors.accentFillPill,
    borderColor: colors.accentBorderPill,
  },
  pillText: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  pillCompact: {
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  pillTextCompact: {
    fontSize: 10,
  },
  pillTextSelected: {
    color: colors.accentText,
  },
  hint: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 9,
  },
  primaryAction: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.buttonPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryActionText: {
    color: colors.buttonOnPrimary,
    fontFamily: fonts.displayMedium,
    fontSize: 12,
  },
  compactAction: {
    minHeight: 36,
    borderRadius: 18,
  },
  compactActionText: {
    fontSize: 11,
  },
  resultLabel: {
    ...typography.labelSm,
    color: colors.muted,
  },
  inviteLink: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    color: colors.mutedStrong,
    fontFamily: fonts.mono,
    fontSize: 9,
    lineHeight: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  copyButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  compactCopy: {
    minHeight: 32,
    borderRadius: 16,
  },
  copyButtonDone: {
    borderColor: colors.successBorder,
    backgroundColor: colors.successFill,
  },
  copyText: {
    color: colors.mutedStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  copyTextDone: {
    color: colors.success,
  },
  leaveButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  leaveText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  disabled: {
    opacity: 0.4,
  },
  });
}
