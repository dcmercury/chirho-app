import { useEffect, useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fonts, type as typography, type ColorTokens } from "../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../theme/ThemeProvider";
import { AuthenticatedImage } from "../../ui/AuthenticatedImage";
import { PauseIcon, PlayIcon } from "../../../features/groups/components/Icons";

export function useProfileStyles() {
  return useThemedStyles(createProfileStyles);
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const styles = useProfileStyles();
  return (
    <View style={styles.section}>
      {action ? (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {action}
        </View>
      ) : (
        <Text style={styles.sectionTitle}>{title}</Text>
      )}
      {children}
    </View>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  const styles = useProfileStyles();
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function InlineError({ message }: { message?: string }) {
  const styles = useProfileStyles();
  return message ? (
    <Text accessibilityRole="alert" style={styles.inlineError}>
      {message}
    </Text>
  ) : null;
}

export function ManageAvatar({
  source,
  label,
}: {
  source?: string | null;
  label: string;
}) {
  const styles = useProfileStyles();
  return source ? (
    <AuthenticatedImage
      accessible={false}
      contentFit="cover"
      path={source}
      style={styles.manageAvatar}
    />
  ) : (
    <View style={[styles.manageAvatar, styles.manageAvatarFallback]}>
      <Text style={styles.manageAvatarInitial}>
        {label.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

export function ToggleRow({
  label,
  value,
  disabled,
  accessory,
  onValueChange,
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  accessory?: ReactNode;
  onValueChange: (value: boolean) => void;
}) {
  const styles = useProfileStyles();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [progress, value]);

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoValue, styles.toggleLabel]}>{label}</Text>
      <View style={styles.toggleActions}>
        {accessory}
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="switch"
          accessibilityState={{ checked: value, disabled }}
          disabled={disabled}
          onPress={() => onValueChange(!value)}
          style={({ pressed }) => [
            styles.toggleTouch,
            pressed && styles.togglePressed,
          ]}
        >
          <View
            style={[
              styles.toggleTrack,
              value && styles.toggleTrackActive,
              disabled && styles.toggleDisabled,
            ]}
          >
            <Animated.View
              style={[
                styles.toggleThumb,
                {
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 12],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export function Pill({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const styles = useProfileStyles();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive, disabled && styles.disabled]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** A selectable pill that also plays a sample of the voice it names. */
export function VoicePill({
  label,
  active,
  disabled,
  loading = false,
  playing,
  onPress,
  onPreview,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  loading?: boolean;
  playing: boolean;
  onPress: () => void;
  onPreview: () => void;
}) {
  const styles = useProfileStyles();
  const { colors } = useTheme();
  const iconColor = active ? colors.accentText : colors.mutedSoft;
  return (
    <View
      style={[
        styles.pill,
        styles.voicePill,
        active && styles.pillActive,
        disabled && styles.disabled,
      ]}
    >
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected: active, disabled }}
        disabled={disabled}
        hitSlop={{ top: 10, bottom: 10, left: 10 }}
        onPress={onPress}
      >
        <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={
          loading
            ? `Cancel loading ${label} sample`
            : playing
              ? `Stop ${label} sample`
              : `Play ${label} sample`
        }
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, right: 8 }}
        onPress={onPreview}
        style={({ pressed }) => [
          styles.voicePreview,
          pressed && styles.voicePreviewPressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={iconColor} size={12} />
        ) : playing ? (
          <PauseIcon color={iconColor} size={12} />
        ) : (
          <PlayIcon color={iconColor} size={12} />
        )}
      </Pressable>
    </View>
  );
}

export function Action({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const styles = useProfileStyles();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, disabled && styles.disabled]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function createProfileStyles(colors: ColorTokens) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 24, paddingBottom: 64 },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorderStrong,
    marginBottom: 24,
  },
  name: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 27,
    textAlign: "center",
  },
  memberSince: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: "center",
    marginTop: 3,
  },
  stats: {
    flexDirection: "row",
    marginTop: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.glassBorder,
  },
  stat: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statValue: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 20,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: 3,
    textTransform: "uppercase",
  },
  section: { marginTop: 28, gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { ...typography.labelSm, color: colors.muted },
  sectionPlus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.glassBorderRow,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionPlusPressed: { opacity: 0.68 },
  sectionPlusText: {
    color: colors.title,
    fontSize: 16,
    lineHeight: 18,
  },
  toggleActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggleLabel: { flex: 1, paddingRight: 8 },
  accountSummary: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
  },
  accountAvatarButton: { position: "relative" },
  accountAvatarPressed: { opacity: 0.68 },
  accountAvatarCamera: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },
  accountSummaryToggle: {
    minHeight: 50,
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountSummaryPressed: { opacity: 0.68 },
  accountSummaryCopy: { flex: 1, minWidth: 0, gap: 3 },
  accountSummaryName: {
    color: colors.title,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  accountSummaryContact: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 10,
  },
  accountCaret: {
    width: 7,
    height: 7,
    marginRight: 4,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: colors.muted,
    transform: [{ rotate: "45deg" }],
  },
  accountCaretExpanded: { transform: [{ rotate: "-135deg" }] },
  caretForward: {
    transform: [{ rotate: "-45deg" }],
  },
  statPressed: { opacity: 0.68 },
  input: {
    minWidth: 0,
  },
  nameFields: { flexDirection: "row", gap: 8 },
  nameField: { flex: 1, minWidth: 0 },
  nameActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  nameSave: {
    alignSelf: "flex-end",
    minWidth: 116,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassBorderLoud,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  nameSaveDisabled: { borderColor: colors.glassBorderSoft, opacity: 0.45 },
  nameSavePressed: { backgroundColor: colors.glassFillHover },
  nameSaveText: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 12,
  },
  nameSaveTextDisabled: { color: colors.muted },
  communitySearch: { flexDirection: "row", gap: 8 },
  communityInput: { flex: 1 },
  searchButton: {
    minWidth: 68,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.buttonPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  searchText: { color: colors.buttonOnPrimary, fontFamily: fonts.bodyMedium, fontSize: 14 },
  infoRow: {
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  infoLabel: { ...typography.caption, color: colors.muted, fontFamily: fonts.body },
  infoValue: {
    ...typography.caption,
    color: colors.mutedStrong,
    fontFamily: fonts.body,
  },
  toggleTouch: {
    width: 44,
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  toggleTrack: {
    width: 32,
    height: 20,
    borderRadius: 10,
    padding: 2,
    backgroundColor: colors.glassFillStrong,
  },
  toggleTrackActive: { backgroundColor: colors.accent },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.cream,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.28,
    shadowRadius: 2,
  },
  toggleDisabled: { opacity: 0.32 },
  togglePressed: { opacity: 0.78 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  pill: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: colors.accentFillPill,
    borderColor: colors.accentBorderPill,
  },
  pillText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 11 },
  pillTextActive: { color: colors.accentText },
  voicePill: { flexDirection: "row", alignItems: "center", gap: 8 },
  voicePreview: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  voicePreviewPressed: { opacity: 0.55 },
  settingGroup: { marginBottom: 8 },
  settingMeta: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 9,
    marginTop: 7,
  },
  list: { flex: 1 },
  manageRowBody: { flex: 1, minWidth: 0 },
  listStatus: { paddingVertical: 36, alignItems: "center" },
  listFooter: { paddingVertical: 18 },
  drawerCount: { marginBottom: 12 },
  manageRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  manageAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  manageAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glassFillStrong,
  },
  manageAvatarInitial: {
    color: colors.mutedStrong,
    fontFamily: fonts.displayMedium,
    fontSize: 13,
  },
  manageCopy: { flex: 1 },
  manageName: { color: colors.title, fontFamily: fonts.bodyMedium, fontSize: 13 },
  manageMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  manageActions: { flexDirection: "row", alignItems: "center" },
  manageActionTouch: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  remove: { color: colors.error, fontFamily: fonts.body, fontSize: 11 },
  join: { color: colors.accentText, fontFamily: fonts.bodyMedium, fontSize: 11 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  inlineError: { color: colors.error, fontFamily: fonts.body, fontSize: 11 },
  action: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.buttonPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  actionText: { color: colors.buttonOnPrimary, fontFamily: fonts.displayMedium, fontSize: 14 },
  deleteButton: { alignItems: "center", paddingVertical: 20 },
  deleteText: { color: colors.error, fontFamily: fonts.body, fontSize: 12 },
  legalLink: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  disabled: { opacity: 0.4 },
  });
}
