import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { HomeProfile, LovedOneGender } from "../../../types/home";
import { CameraIcon } from "../../../features/groups/components/Icons";
import { useTheme } from "../../../theme/ThemeProvider";
import { GenderCircles } from "../../ui/GenderCircles";
import { GlassInput } from "../../ui/GlassInput";
import { InlineError, ManageAvatar, useProfileStyles } from "./ProfileControls";

export function AccountSection({
  account,
  avatar,
  visible,
  pending,
  genderPending,
  avatarPending,
  error,
  genderError,
  avatarError,
  onSave,
  onSaveGender,
  onChangeAvatar,
}: {
  account: HomeProfile["account"];
  avatar: string;
  visible: boolean;
  pending: boolean;
  genderPending: boolean;
  avatarPending: boolean;
  error?: string;
  genderError?: string;
  avatarError?: string;
  onSave: (firstName: string, lastName: string) => Promise<boolean>;
  onSaveGender: (gender: LovedOneGender) => Promise<boolean>;
  onChangeAvatar: () => void;
}) {
  const styles = useProfileStyles();
  const { colors } = useTheme();
  const [firstName, setFirstName] = useState(account.firstName || "");
  const [lastName, setLastName] = useState(account.lastName || "");
  const [expanded, setExpanded] = useState(false);
  const wasVisible = useRef(false);
  const authoritativeFirstName = account.firstName || "";
  const authoritativeLastName = account.lastName || "";
  const lockedGender = account.gender;
  const dirty =
    firstName.trim() !== authoritativeFirstName.trim() ||
    lastName.trim() !== authoritativeLastName.trim();

  useEffect(() => {
    const opened = visible && !wasVisible.current;
    wasVisible.current = visible;
    if (opened) setExpanded(false);
    if (opened || !dirty) {
      setFirstName(authoritativeFirstName);
      setLastName(authoritativeLastName);
    }
  }, [
    authoritativeFirstName,
    authoritativeLastName,
    dirty,
    visible,
  ]);

  const valid = firstName.trim().length > 0;
  const canSave = dirty && valid && !pending;
  const fullName =
    [authoritativeFirstName, authoritativeLastName].filter(Boolean).join(" ") ||
    "Not set";
  const contact =
    [account.phone, account.email].filter(Boolean).join(" · ") ||
    "No contact information";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.accountSummary}>
        <Pressable
          accessibilityLabel="Change profile photo"
          accessibilityRole="button"
          accessibilityState={{ disabled: avatarPending }}
          disabled={avatarPending}
          onPress={onChangeAvatar}
          style={({ pressed }) => [
            styles.accountAvatarButton,
            avatarPending && styles.disabled,
            pressed && styles.accountAvatarPressed,
          ]}
        >
          <ManageAvatar label={fullName} source={avatar} />
          <View pointerEvents="none" style={styles.accountAvatarCamera}>
            <CameraIcon color={colors.cream} size={12} />
          </View>
        </Pressable>
        <Pressable
          accessibilityLabel={`${expanded ? "Collapse" : "Expand"} account details`}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((current) => !current)}
          style={({ pressed }) => [
            styles.accountSummaryToggle,
            pressed && styles.accountSummaryPressed,
          ]}
        >
          <View style={styles.accountSummaryCopy}>
            <Text style={styles.accountSummaryName}>{fullName}</Text>
            <Text numberOfLines={1} style={styles.accountSummaryContact}>
              {contact}
            </Text>
          </View>
          <View
            style={[
              styles.accountCaret,
              expanded && styles.accountCaretExpanded,
            ]}
          />
        </Pressable>
      </View>
      {expanded ? (
        <>
          <View style={styles.nameFields}>
            <GlassInput
              accessibilityLabel="First name"
              editable={!pending}
              onChangeText={setFirstName}
              placeholder="First name"
              style={[styles.input, styles.nameField]}
              value={firstName}
            />
            <GlassInput
              accessibilityLabel="Last name"
              editable={!pending}
              onChangeText={setLastName}
              placeholder="Last name"
              style={[styles.input, styles.nameField]}
              value={lastName}
            />
          </View>
          <View style={styles.nameActions}>
            <GenderCircles
              disabled={Boolean(lockedGender) || genderPending}
              onChange={(gender) => {
                if (lockedGender) return;
                void onSaveGender(gender);
              }}
              value={lockedGender}
            />
            <Pressable
              accessibilityLabel="Save name"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              disabled={!canSave}
              onPress={() => {
                void onSave(firstName, lastName);
              }}
              style={({ pressed }) => [
                styles.nameSave,
                !canSave && styles.nameSaveDisabled,
                pressed && styles.nameSavePressed,
              ]}
            >
              <Text
                style={[
                  styles.nameSaveText,
                  !canSave && styles.nameSaveTextDisabled,
                ]}
              >
                Save name
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
      <InlineError message={error} />
      <InlineError message={genderError} />
      <InlineError message={avatarError} />
    </View>
  );
}
