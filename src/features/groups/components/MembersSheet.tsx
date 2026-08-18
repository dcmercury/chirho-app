import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../../../theme/tokens";
import type { GroupInviteResult, GroupMember, PrayerGroup } from "../types";
import { CheckIcon, CopyIcon } from "./Icons";
import { GroupAvatar } from "./GroupAvatar";

interface MembersSheetProps {
  visible: boolean;
  group: PrayerGroup;
  members: GroupMember[];
  currentUserId?: string | null;
  onClose: () => void;
  onInvite: (
    firstName: string,
    phone: string,
    personal: boolean,
  ) => Promise<GroupInviteResult>;
  onLeave: () => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
}

export function MembersSheet({
  visible,
  group,
  members,
  currentUserId,
  onClose,
  onInvite,
  onLeave,
  onRemove,
}: MembersSheetProps) {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"automatic" | "personal">("automatic");
  const [inviteResult, setInviteResult] = useState<GroupInviteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) {
      setFirstName("");
      setPhone("");
      setMethod("automatic");
      setInviteResult(null);
      setError(null);
      setCopied(false);
    }
  }, [visible]);

  const submitInvite = async () => {
    const digits = phone.replace(/\D/g, "");
    if (!firstName.trim() || digits.length < 10) {
      setError("Enter a first name and valid phone number.");
      return;
    }
    const normalized = digits.length === 10 ? `+1${digits}` : `+${digits}`;
    setBusy(true);
    setError(null);
    try {
      const result = await onInvite(
        firstName.trim(),
        normalized,
        method === "personal",
      );
      setInviteResult(result);
      if (method === "personal") {
        const body = encodeURIComponent(
          `I want to invite you to ${group.name}. ${result.inviteLink}`,
        );
        await Linking.openURL(`sms:${normalized}?body=${body}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create invitation.");
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteResult) return;
    await Clipboard.setStringAsync(inviteResult.inviteLink);
    setCopied(true);
  };

  const confirmLeave = () => {
    Alert.alert(
      "Leave group?",
      `You will no longer have access to ${group.name}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            onLeave().catch((err) => {
              setBusy(false);
              setError(err instanceof Error ? err.message : "Unable to leave group.");
            });
          },
        },
      ],
    );
  };

  const confirmRemove = (member: GroupMember, name: string) => {
    Alert.alert("Remove member?", `${name} will lose access to this group.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setBusy(true);
          onRemove(member.memberId)
            .catch((err) =>
              setError(
                err instanceof Error ? err.message : "Unable to remove member.",
              ),
            )
            .finally(() => setBusy(false));
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modal}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <BlurView
          intensity={60}
          tint="dark"
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.label}>MEMBERS</Text>
              <Text style={styles.title}>{group.name}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            {members.map((member) => {
              const name =
                [
                  member.profile?.firstName || member.firstName,
                  member.profile?.lastName,
                ]
                  .filter(Boolean)
                  .join(" ") || "Invited member";
              const canRemove =
                group.canManageMembers &&
                member.clerkuuid !== currentUserId &&
                member.role !== "admin";
              return (
                <View key={member.memberId} style={styles.member}>
                  <GroupAvatar
                    uri={member.profile?.avatar}
                    name={name}
                    size={40}
                    borderColor="rgba(255,255,255,0.18)"
                  />
                  <View style={styles.memberText}>
                    <Text style={styles.memberName}>{name}</Text>
                    <Text style={styles.memberMeta}>
                      {member.role} · {member.status}
                    </Text>
                  </View>
                  {canRemove ? (
                    <Pressable
                      disabled={busy}
                      onPress={() => confirmRemove(member, name)}
                    >
                      <Text style={styles.remove}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}

            {group.canInvite ? (
              <View style={styles.invite}>
                <Text style={styles.inviteTitle}>Invite to {group.name}</Text>
                {inviteResult ? (
                  <>
                    <Text style={styles.label}>INVITE LINK</Text>
                    <Text selectable style={styles.link}>
                      {inviteResult.inviteLink}
                    </Text>
                    <Pressable
                      onPress={copyInvite}
                      style={[styles.copy, copied && styles.copied]}
                    >
                      {copied ? (
                        <CheckIcon color="#34d399" />
                      ) : (
                        <CopyIcon color={colors.mutedStrong} />
                      )}
                      <Text style={[styles.copyText, copied && styles.copiedText]}>
                        {copied ? "Copied" : "Copy link"}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={styles.inputRow}>
                      <TextInput
                        value={firstName}
                        onChangeText={(text) => {
                          setFirstName(text);
                          setError(null);
                        }}
                        placeholder="First name"
                        placeholderTextColor="rgba(255,255,255,0.25)"
                        style={[styles.input, styles.nameInput]}
                      />
                      <TextInput
                        value={phone}
                        onChangeText={(text) => {
                          setPhone(formatPhone(text));
                          setError(null);
                        }}
                        keyboardType="phone-pad"
                        placeholder="(555) 123-4567"
                        placeholderTextColor="rgba(255,255,255,0.25)"
                        style={styles.input}
                      />
                    </View>
                    <Text style={styles.label}>SEND METHOD</Text>
                    <View style={styles.methodRow}>
                      {(["automatic", "personal"] as const).map((value) => (
                        <Pressable
                          key={value}
                          onPress={() => setMethod(value)}
                          style={[
                            styles.method,
                            method === value && styles.methodSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.methodText,
                              method === value && styles.methodTextSelected,
                            ]}
                          >
                            {value === "automatic"
                              ? "Automatic SMS"
                              : "Text personally"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={styles.hint}>
                      {method === "automatic"
                        ? "SMS will be sent automatically"
                        : "Opens your Messages app"}
                    </Text>
                    <Pressable
                      disabled={busy}
                      onPress={submitInvite}
                      style={[styles.submit, busy && styles.disabled]}
                    >
                      <Text style={styles.submitText}>
                        {busy
                          ? "Sending..."
                          : method === "automatic"
                            ? "Send invite"
                            : "Create & text"}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : group.canLeave ? (
              <Pressable
                disabled={busy}
                onPress={confirmLeave}
                style={styles.leave}
              >
                <Text style={styles.leaveText}>Leave Group</Text>
              </Pressable>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    maxHeight: "82%",
    paddingTop: 8,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(12,12,12,0.82)",
  },
  handle: {
    width: 36,
    height: 4,
    alignSelf: "center",
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.footerRule,
  },
  label: {
    color: colors.mutedGhost,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  title: { color: colors.white, fontFamily: fonts.displayMedium, fontSize: 18 },
  done: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 13 },
  content: { gap: 10, paddingVertical: 14 },
  member: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 6,
  },
  memberText: { flex: 1, gap: 2 },
  memberName: { color: colors.mutedStrong, fontFamily: fonts.bodyMedium, fontSize: 13 },
  memberMeta: {
    color: colors.mutedGhost,
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: "uppercase",
  },
  remove: { color: colors.error, fontFamily: fonts.body, fontSize: 11 },
  invite: {
    gap: 10,
    padding: 14,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  inviteTitle: { color: colors.white, fontFamily: fonts.displayMedium, fontSize: 14 },
  inputRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
  },
  nameInput: { flex: 0.7 },
  methodRow: { flexDirection: "row", gap: 6 },
  method: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  methodSelected: {
    borderColor: "rgba(249,115,22,0.3)",
    backgroundColor: "rgba(249,115,22,0.15)",
  },
  methodText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 10 },
  methodTextSelected: { color: colors.accent },
  hint: {
    color: "rgba(255,255,255,0.25)",
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: "uppercase",
  },
  submit: {
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  submitText: { color: colors.black, fontFamily: fonts.displayMedium, fontSize: 12 },
  link: {
    padding: 10,
    borderRadius: 8,
    color: colors.mutedStrong,
    fontFamily: fonts.mono,
    fontSize: 9,
    lineHeight: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
  },
  copy: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    padding: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFillHover,
  },
  copied: {
    borderColor: "rgba(52,211,153,0.3)",
    backgroundColor: "rgba(52,211,153,0.15)",
  },
  copyText: { color: colors.mutedStrong, fontFamily: fonts.mono, fontSize: 9 },
  copiedText: { color: "#34d399" },
  leave: { alignSelf: "center", paddingVertical: 16 },
  leaveText: {
    color: "#94a3b8",
    fontFamily: fonts.body,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  error: { color: colors.error, fontFamily: fonts.body, fontSize: 11 },
  disabled: { opacity: 0.4 },
});
