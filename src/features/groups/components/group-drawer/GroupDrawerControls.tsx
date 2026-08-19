import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, type as typography } from "../../../../theme/tokens";

export function GroupDrawerSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function GroupDrawerError({ message }: { message?: string }) {
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
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.pill,
        selected && styles.pillSelected,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
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
    color: colors.white,
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
    color: colors.white,
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
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  firstNameInput: {
    flex: 0.75,
  },
  messageInput: {
    minHeight: 68,
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
    backgroundColor: "rgba(249,115,22,0.14)",
    borderColor: "rgba(249,115,22,0.45)",
  },
  pillText: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  pillTextSelected: {
    color: colors.accent,
  },
  hint: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 9,
  },
  primaryAction: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryActionText: {
    color: colors.black,
    fontFamily: fonts.displayMedium,
    fontSize: 12,
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
  copyButtonDone: {
    borderColor: "rgba(52,211,153,0.3)",
    backgroundColor: "rgba(52,211,153,0.12)",
  },
  copyText: {
    color: colors.mutedStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  copyTextDone: {
    color: "#34d399",
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
