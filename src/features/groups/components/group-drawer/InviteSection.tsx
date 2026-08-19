import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { colors } from "../../../../theme/tokens";
import type { GroupInviteResult } from "../../types";
import { CheckIcon, CopyIcon } from "../Icons";
import {
  GroupDrawerError,
  GroupDrawerPill,
  GroupDrawerSection,
  styles,
} from "./GroupDrawerControls";

type InviteMethod = "automatic" | "personal";

interface InviteSectionProps {
  visible: boolean;
  groupName: string;
  result: GroupInviteResult | null;
  pending: boolean;
  copied: boolean;
  error?: string;
  onClearError: () => void;
  onSubmit: (
    firstName: string,
    phone: string,
    customMessage: string,
    method: InviteMethod,
  ) => void;
  onCopy: () => void;
}

export function InviteSection({
  visible,
  groupName,
  result,
  pending,
  copied,
  error,
  onClearError,
  onSubmit,
  onCopy,
}: InviteSectionProps) {
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

  return (
    <GroupDrawerSection title={`Invite to ${groupName}`}>
      {result ? (
        <>
          <Text style={styles.resultLabel}>Invite link</Text>
          <Text selectable style={styles.inviteLink}>
            {result.inviteLink}
          </Text>
          <Pressable
            accessibilityLabel={copied ? "Invite link copied" : "Copy invite link"}
            accessibilityRole="button"
            accessibilityState={{ selected: copied }}
            onPress={onCopy}
            style={[
              styles.copyButton,
              copied && styles.copyButtonDone,
            ]}
          >
            {copied ? (
              <CheckIcon color="#34d399" />
            ) : (
              <CopyIcon color={colors.mutedStrong} />
            )}
            <Text
              style={[
                styles.copyText,
                copied && styles.copyTextDone,
              ]}
            >
              {copied ? "Copied" : "Copy link"}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel="Invitee first name"
              autoCapitalize="words"
              editable={!pending}
              onChangeText={(value) => {
                setFirstName(value);
                onClearError();
              }}
              placeholder="First name"
              placeholderTextColor={colors.mutedGhost}
              style={[styles.input, styles.firstNameInput]}
              value={firstName}
            />
            <TextInput
              accessibilityLabel="Invitee phone number"
              editable={!pending}
              keyboardType="phone-pad"
              onChangeText={(value) => {
                setPhone(formatPhone(value));
                onClearError();
              }}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.mutedGhost}
              style={styles.input}
              value={phone}
            />
          </View>
          <TextInput
            accessibilityLabel="Custom invitation message"
            editable={!pending}
            multiline
            onChangeText={(value) => {
              setCustomMessage(value);
              onClearError();
            }}
            placeholder="Personal message (optional)"
            placeholderTextColor={colors.mutedGhost}
            style={[styles.input, styles.messageInput]}
            textAlignVertical="top"
            value={customMessage}
          />
          <View style={styles.methodRow}>
            <GroupDrawerPill
              disabled={pending}
              label="Automatic SMS"
              onPress={() => setMethod("automatic")}
              selected={method === "automatic"}
            />
            <GroupDrawerPill
              disabled={pending}
              label="Text personally"
              onPress={() => setMethod("personal")}
              selected={method === "personal"}
            />
          </View>
          <Text style={styles.hint}>
            {method === "automatic"
              ? "SMS will be sent automatically"
              : "Opens your Messages app"}
          </Text>
          <Pressable
            accessibilityLabel={
              method === "automatic" ? "Send invite" : "Create and text invite"
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: pending, busy: pending }}
            disabled={pending}
            onPress={() => onSubmit(firstName, phone, customMessage, method)}
            style={[
              styles.primaryAction,
              pending && styles.disabled,
            ]}
          >
            <Text style={styles.primaryActionText}>
              {pending
                ? "Sending…"
                : method === "automatic"
                  ? "Send invite"
                  : "Create & text"}
            </Text>
          </Pressable>
        </>
      )}
      <GroupDrawerError message={error} />
    </GroupDrawerSection>
  );
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
