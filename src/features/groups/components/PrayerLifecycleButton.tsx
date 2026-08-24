import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { fonts, type ColorTokens } from "../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../theme/ThemeProvider";
import type {
  GroupMessage,
  PrayerRequestArchiveReason,
  PrayerRequestResolveReason,
} from "../types";
import { presentChoices } from "./ContentSafetyButton";

const RESOLVE_REASONS: {
  id: PrayerRequestResolveReason;
  label: string;
}[] = [
  { id: "answered", label: "Answered" },
  { id: "situation_changed", label: "Situation changed" },
  { id: "no_longer_needed", label: "No longer needed" },
  { id: "other", label: "Other" },
];

const ARCHIVE_REASONS: {
  id: PrayerRequestArchiveReason;
  label: string;
}[] = [
  { id: "inactive", label: "Inactive" },
  { id: "no_recent_updates", label: "No recent updates" },
  { id: "duplicate", label: "Duplicate" },
  { id: "other", label: "Other" },
];

interface PrayerLifecycleButtonProps {
  message: GroupMessage;
  authorName: string;
  isOwn: boolean;
  isAdmin: boolean;
  onPostUpdate: () => void;
  onResolve: (reason: PrayerRequestResolveReason) => void | Promise<void>;
  onArchive: (reason: PrayerRequestArchiveReason) => void | Promise<void>;
  onSuggestArchive: (
    reason: PrayerRequestArchiveReason,
  ) => void | Promise<void>;
  onRestore: () => void | Promise<void>;
  onKeepActive: () => void | Promise<void>;
  onRequestUpdate: () => void | Promise<void>;
}

export function PrayerLifecycleButton({
  message,
  authorName,
  isOwn,
  isAdmin,
  onPostUpdate,
  onResolve,
  onArchive,
  onSuggestArchive,
  onRestore,
  onKeepActive,
  onRequestUpdate,
}: PrayerLifecycleButtonProps) {
  const styles = useThemedStyles(createStyles);
  const { appearance } = useTheme();
  const canRestore = message.status === "archived" && (isOwn || isAdmin);
  const label = canRestore
    ? "Restore"
    : isOwn
      ? "Manage"
      : isAdmin
        ? "Archive"
        : "Suggest";

  if (message.status === "archived" && !canRestore) return null;

  const chooseResolveReason = () => {
    presentChoices(
      "Why are you resolving this prayer?",
      [
        ...RESOLVE_REASONS.map((reason) => ({
          label: reason.label,
          onPress: () =>
            Alert.alert(
              "Resolve this prayer?",
              "It will move from the active list to Prayer History.",
              [
                { text: "Cancel", style: "cancel" as const },
                {
                  text: "Resolve",
                  onPress: () => void onResolve(reason.id),
                },
              ],
            ),
        })),
        { label: "Cancel", cancel: true },
      ],
      appearance,
    );
  };

  const chooseArchiveReason = (suggestion: boolean) => {
    presentChoices(
      suggestion
        ? "Why should this prayer be reviewed?"
        : "Why are you archiving this prayer?",
      [
        ...ARCHIVE_REASONS.map((reason) => ({
          label: reason.label,
          onPress: () =>
            Alert.alert(
              suggestion ? "Suggest archiving?" : "Archive this prayer?",
              suggestion
                ? `This will ask ${authorName} and the group admins to review it.`
                : `This prayer was shared by ${authorName}. Archiving will remove it from the active prayer list but keep it in Prayer History.`,
              [
                { text: "Cancel", style: "cancel" as const },
                {
                  text: suggestion ? "Send suggestion" : "Archive",
                  style: suggestion ? ("default" as const) : ("destructive" as const),
                  onPress: () =>
                    void (suggestion
                      ? onSuggestArchive(reason.id)
                      : onArchive(reason.id)),
                },
              ],
            ),
        })),
        { label: "Cancel", cancel: true },
      ],
      appearance,
    );
  };

  const handlePress = () => {
    if (canRestore) {
      Alert.alert(
        "Restore this prayer?",
        "It will return to the active prayer list.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Restore", onPress: () => void onRestore() },
        ],
      );
      return;
    }
    if (isOwn) {
      presentChoices(
        "Your prayer request",
        [
          { label: "Post update", onPress: onPostUpdate },
          { label: "Resolve…", onPress: chooseResolveReason },
          ...(message.isStale
            ? [{ label: "Keep active", onPress: () => void onKeepActive() }]
            : []),
          { label: "Cancel", cancel: true },
        ],
        appearance,
      );
      return;
    }
    presentChoices(
      `${authorName}'s prayer request`,
      [
        {
          label: "Request an update",
          onPress: () =>
            Alert.alert(
              "Request an update?",
              `${authorName} will receive a private notification without the prayer text.`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Send request", onPress: () => void onRequestUpdate() },
              ],
            ),
        },
        {
          label: isAdmin ? "Archive…" : "Suggest archive…",
          destructive: isAdmin,
          onPress: () => chooseArchiveReason(!isAdmin),
        },
        { label: "Cancel", cancel: true },
      ],
      appearance,
    );
  };

  return (
    <Pressable
      accessibilityLabel={`${label} prayer request`}
      accessibilityRole="button"
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    button: {
      borderWidth: 1,
      borderColor: colors.glassBorderRow,
      borderRadius: 14,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    buttonPressed: { opacity: 0.6 },
    label: {
      color: colors.mutedStrong,
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
      letterSpacing: 0.3,
    },
  });
}
