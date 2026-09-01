import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet } from "react-native";
import type { Appearance, ColorTokens } from "../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../theme/ThemeProvider";
import { MoreIcon } from "./Icons";

export const REPORT_REASONS = [
  { id: "harassment", label: "Harassment or bullying" },
  { id: "hate", label: "Hate or abusive language" },
  { id: "sexual", label: "Sexual or inappropriate" },
  { id: "spam", label: "Spam" },
  { id: "other", label: "Other" },
] as const;

export type ReportReasonId = (typeof REPORT_REASONS)[number]["id"];

interface ContentSafetyButtonProps {
  isOwn: boolean;
  isAdmin: boolean;
  authorName: string;
  contentLabel: "prayer request" | "prayer";
  onDelete: () => void | Promise<void>;
  onReport: (reason: ReportReasonId) => void | Promise<void>;
  onBlock: () => void | Promise<void>;
}

function createStyles(_colors: ColorTokens) {
  return StyleSheet.create({
    button: {
      width: 28,
      height: 28,
      marginLeft: "auto",
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { opacity: 0.55 },
  });
}

export function presentChoices(
  title: string,
  items: {
    label: string;
    destructive?: boolean;
    cancel?: boolean;
    onPress?: () => void;
  }[],
  appearance: Appearance,
) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: items.map((item) => item.label),
        cancelButtonIndex: items.findIndex((item) => item.cancel),
        destructiveButtonIndex: items.findIndex((item) => item.destructive),
        userInterfaceStyle: appearance,
      },
      (index) => items[index]?.onPress?.(),
    );
    return;
  }

  Alert.alert(
    title,
    undefined,
    items.map((item) => ({
      text: item.label,
      style: item.cancel ? "cancel" : item.destructive ? "destructive" : "default",
      onPress: item.onPress,
    })),
  );
}

export function ContentSafetyButton({
  isOwn,
  isAdmin,
  authorName,
  contentLabel,
  onDelete,
  onReport,
  onBlock,
}: ContentSafetyButtonProps) {
  const styles = useThemedStyles(createStyles);
  const { colors, appearance } = useTheme();

  const confirmDelete = () => {
    Alert.alert(
      `Delete this ${contentLabel}?`,
      "It will be removed from the group.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ],
    );
  };

  const confirmBlock = () => {
    Alert.alert(
      `Block ${authorName}?`,
      "You will no longer see their prayer requests or prayers.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Block", style: "destructive", onPress: onBlock },
      ],
    );
  };

  const chooseReason = () => {
    presentChoices("Why are you reporting this?", [
      ...REPORT_REASONS.map((reason) => ({
        label: reason.label,
        onPress: () => {
          void Promise.resolve(onReport(reason.id)).then(() => {
            setTimeout(() => {
              Alert.alert(
                "Report sent",
                "Thanks. We will review this. Block this person so you won't see their prayers?",
                [
                  { text: "Not now", style: "cancel" },
                  { text: "Block", style: "destructive", onPress: onBlock },
                ],
              );
            }, 250);
          });
        },
      })),
      { label: "Cancel", cancel: true },
    ], appearance);
  };

  const openMenu = () => {
    const items: {
      label: string;
      destructive?: boolean;
      cancel?: boolean;
      onPress?: () => void;
    }[] = [];

    if (isOwn || isAdmin) {
      items.push({
        label: "Delete",
        destructive: true,
        onPress: confirmDelete,
      });
    }
    if (!isOwn) {
      items.push({ label: "Report…", onPress: chooseReason });
      items.push({ label: "Block…", onPress: confirmBlock });
    }
    items.push({ label: "Cancel", cancel: true });

    presentChoices(
      isOwn ? `Your ${contentLabel}` : `${authorName}'s ${contentLabel}`,
      items,
      appearance,
    );
  };

  return (
    <Pressable
      accessibilityLabel={`${contentLabel} options`}
      accessibilityRole="button"
      hitSlop={8}
      onPress={openMenu}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <MoreIcon color={colors.mutedStrong} size={14} />
    </Pressable>
  );
}
