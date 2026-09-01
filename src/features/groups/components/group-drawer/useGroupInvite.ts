import { useCallback, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { inviteGroupMember, lookupInvitePhone } from "../../../../lib/api";
import type {
  GroupInviteResult,
  InviteeStatus,
  TokenProvider,
} from "../../types";

export type InviteMethod = "automatic" | "personal";

export function useGroupInvite({
  visible,
  groupuuid,
  groupName,
  tokenProvider,
  onChanged,
}: {
  visible: boolean;
  groupuuid: string;
  groupName: string;
  tokenProvider: TokenProvider;
  onChanged?: () => Promise<void> | void;
}) {
  const [result, setResult] = useState<GroupInviteResult | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [inviteeStatus, setInviteeStatus] = useState<InviteeStatus>("new");
  const [inviteeName, setInviteeName] = useState<string | null>(null);
  const visibleRef = useRef(visible);
  const pendingRef = useRef(false);
  const lookupSeq = useRef(0);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  visibleRef.current = visible;

  useEffect(() => {
    if (visible) return;
    setResult(null);
    setPending(false);
    setCopied(false);
    setError(undefined);
    setInviteeStatus("new");
    setInviteeName(null);
    pendingRef.current = false;
    lookupSeq.current += 1;
    if (lookupTimer.current) {
      clearTimeout(lookupTimer.current);
      lookupTimer.current = null;
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, []);

  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  const lookupPhone = useCallback(
    (phone: string) => {
      const digits = phone.replace(/\D/g, "");
      if (lookupTimer.current) {
        clearTimeout(lookupTimer.current);
        lookupTimer.current = null;
      }
      if (digits.length < 10) {
        lookupSeq.current += 1;
        setInviteeStatus("new");
        setInviteeName(null);
        return;
      }
      const seq = ++lookupSeq.current;
      lookupTimer.current = setTimeout(() => {
        lookupTimer.current = null;
        void (async () => {
          try {
            const token = await tokenProvider();
            if (!token || seq !== lookupSeq.current) return;
            const normalized = digits.length === 10 ? `+1${digits}` : `+${digits}`;
            const match = await lookupInvitePhone(groupuuid, normalized, token);
            if (!visibleRef.current || seq !== lookupSeq.current) return;
            setInviteeStatus(match.status);
            setInviteeName(match.firstName?.trim() || null);
          } catch {
            if (visibleRef.current && seq === lookupSeq.current) {
              setInviteeStatus("new");
              setInviteeName(null);
            }
          }
        })();
      }, 350);
    },
    [groupuuid, tokenProvider],
  );

  const submit = useCallback(
    (
      firstName: string,
      phone: string,
      customMessage: string,
      method: InviteMethod,
    ) => {
      const digits = phone.replace(/\D/g, "");
      if (inviteeStatus === "already_member") {
        setError("They're already in this group.");
        return;
      }
      if (!firstName.trim() || digits.length < 10) {
        setError("Enter a first name and valid phone number.");
        return;
      }
      if (pendingRef.current) return;
      const normalized = digits.length === 10 ? `+1${digits}` : `+${digits}`;
      const inApp = inviteeStatus === "app_user";
      const skipSMS = inApp || method === "personal";
      pendingRef.current = true;
      setPending(true);
      setError(undefined);
      void (async () => {
        try {
          const token = await tokenProvider();
          if (!token) {
            throw new Error("Your session expired. Please sign in again.");
          }
          const invite = await inviteGroupMember(
            groupuuid,
            firstName.trim(),
            normalized,
            skipSMS,
            inApp ? undefined : customMessage.trim() || undefined,
            token,
          );
          if (visibleRef.current) {
            setResult(invite);
            setCopied(false);
          }
          await onChanged?.();
          if (method === "personal" && !inApp) {
            const body = encodeURIComponent(
              `I want to invite you to ${groupName}. ${invite.inviteLink}`,
            );
            await Linking.openURL(`sms:${normalized}?body=${body}`);
          }
        } catch (caught) {
          if (visibleRef.current) {
            setError(
              caught instanceof Error
                ? caught.message
                : "Unable to create invitation.",
            );
          }
        } finally {
          pendingRef.current = false;
          if (visibleRef.current) setPending(false);
        }
      })();
    },
    [groupName, groupuuid, inviteeStatus, onChanged, tokenProvider],
  );

  const copy = useCallback(async () => {
    if (!result) return;
    try {
      await Clipboard.setStringAsync(result.inviteLink);
      if (visibleRef.current) setCopied(true);
    } catch (caught) {
      if (visibleRef.current) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to copy invite link.",
        );
      }
    }
  }, [result]);

  return {
    result,
    pending,
    copied,
    error,
    inviteeStatus,
    inviteeName,
    clearError,
    lookupPhone,
    submit,
    copy,
  };
}
