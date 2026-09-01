import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { GlassInput } from "../../../../components/ui/GlassInput";
import { useTheme } from "../../../../theme/ThemeProvider";
import type { TokenProvider } from "../../types";
import { CheckIcon, CopyIcon } from "../Icons";
import {
  GroupDrawerError,
  GroupDrawerPill,
  useGroupDrawerStyles,
} from "./GroupDrawerControls";
import { useGroupInvite, type InviteMethod } from "./useGroupInvite";

interface InviteSectionProps {
  visible: boolean;
  groupName: string;
  groupuuid: string;
  tokenProvider: TokenProvider;
  onChanged?: () => Promise<void> | void;
  showTitle?: boolean;
  compact?: boolean;
}

export function InviteSection({
  visible,
  groupName,
  groupuuid,
  tokenProvider,
  onChanged,
  showTitle = true,
  compact = false,
}: InviteSectionProps) {
  const styles = useGroupDrawerStyles();
  const { colors } = useTheme();
  const invite = useGroupInvite({
    visible,
    groupuuid,
    groupName,
    tokenProvider,
    onChanged,
  });
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [method, setMethod] = useState<InviteMethod>("automatic");

  useEffect(() => {
    if (!visible) {
      setFirstName("");
      setPhone("");
      setCustomMessage("");
      setMethod("automatic");
    }
  }, [visible]);

  useEffect(() => {
    if (!invite.inviteeName) return;
    setFirstName((current) => (current.trim() ? current : invite.inviteeName!));
  }, [invite.inviteeName]);

  const inAppInvite = invite.inviteeStatus === "app_user";
  const alreadyMember = invite.inviteeStatus === "already_member";
  const hideSms = inAppInvite || alreadyMember;

  const body = invite.result ? (
    <>
      {inAppInvite ? (
        <Text style={styles.hint}>
          Invite sent. They&apos;ll get a notification in ChiRho.
        </Text>
      ) : (
        <Text style={styles.resultLabel}>Invite link</Text>
      )}
      <Text selectable style={styles.inviteLink}>
        {invite.result.inviteLink}
      </Text>
      <Pressable
        accessibilityLabel={invite.copied ? "Invite link copied" : "Copy invite link"}
        accessibilityRole="button"
        accessibilityState={{ selected: invite.copied }}
        onPress={() => {
          void invite.copy();
        }}
        style={[
          styles.copyButton,
          compact && styles.compactCopy,
          invite.copied && styles.copyButtonDone,
        ]}
      >
        {invite.copied ? (
          <CheckIcon color={colors.success} />
        ) : (
          <CopyIcon color={colors.mutedStrong} />
        )}
        <Text
          style={[
            styles.copyText,
            compact && styles.compactActionText,
            invite.copied && styles.copyTextDone,
          ]}
        >
          {invite.copied ? "Copied" : "Copy link"}
        </Text>
      </Pressable>
      <GroupDrawerError message={invite.error} />
    </>
  ) : (
    <>
      <View style={styles.inputRow}>
        <GlassInput
          accessibilityLabel="Invitee first name"
          autoCapitalize="words"
          editable={!invite.pending}
          onChangeText={(value) => {
            setFirstName(value);
            invite.clearError();
          }}
          placeholder="First name"
          style={[
            styles.input,
            styles.firstNameInput,
            compact && styles.compactInput,
          ]}
          value={firstName}
        />
        <GlassInput
          accessibilityLabel="Invitee phone number"
          editable={!invite.pending}
          keyboardType="phone-pad"
          onChangeText={(value) => {
            setPhone(formatPhone(value));
            invite.clearError();
            invite.lookupPhone(value);
          }}
          placeholder="(555) 123-4567"
          style={[styles.input, compact && styles.compactInput]}
          value={phone}
        />
      </View>
      {!hideSms ? (
        <GlassInput
          accessibilityLabel="Custom invitation message"
          editable={!invite.pending}
          multiline
          onChangeText={(value) => {
            setCustomMessage(value);
            invite.clearError();
          }}
          placeholder="Personal message (optional)"
          style={[
            styles.input,
            styles.messageInput,
            compact && styles.compactInput,
            compact && styles.compactMessage,
          ]}
          textAlignVertical="top"
          value={customMessage}
        />
      ) : null}
      {hideSms ? null : (
        <View style={styles.methodRow}>
          <GroupDrawerPill
            compact={compact}
            disabled={invite.pending}
            label="Automatic SMS"
            onPress={() => setMethod("automatic")}
            selected={method === "automatic"}
          />
          <GroupDrawerPill
            compact={compact}
            disabled={invite.pending}
            label="Text personally"
            onPress={() => setMethod("personal")}
            selected={method === "personal"}
          />
        </View>
      )}
      <Text style={styles.hint}>
        {alreadyMember
          ? "They're already in this group"
          : inAppInvite
            ? "They already have ChiRho. We'll notify them in the app."
            : method === "automatic"
              ? "SMS will be sent automatically"
              : "Opens your Messages app"}
      </Text>
      <Pressable
        accessibilityLabel={
          alreadyMember
            ? "Already a member"
            : inAppInvite
              ? "Send invite"
              : method === "automatic"
                ? "Send invite"
                : "Create and text invite"
        }
        accessibilityRole="button"
        accessibilityState={{
          disabled: invite.pending || alreadyMember,
          busy: invite.pending,
        }}
        disabled={invite.pending || alreadyMember}
        onPress={() => invite.submit(firstName, phone, customMessage, method)}
        style={[
          styles.primaryAction,
          compact && styles.compactAction,
          (invite.pending || alreadyMember) && styles.disabled,
        ]}
      >
        <Text
          style={[
            styles.primaryActionText,
            compact && styles.compactActionText,
          ]}
        >
          {invite.pending
            ? "Sending…"
            : alreadyMember
              ? "Already a member"
              : inAppInvite || method === "automatic"
                ? "Send invite"
                : "Create & text"}
        </Text>
      </Pressable>
      <GroupDrawerError message={invite.error} />
    </>
  );

  return (
    <View style={compact ? styles.compactSection : styles.section}>
      {showTitle ? (
        <Text style={styles.sectionTitle}>Invite to {groupName}</Text>
      ) : null}
      {body}
    </View>
  );
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
