import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  deleteGroup,
  getGroupAdminDetails,
  getGroupMembers,
  inviteGroupMember,
  leaveGroup,
  previewGroupContent,
  regenerateGroupBackground,
  removeGroupMember,
  updateGroup,
} from "../../../../lib/api";
import type {
  GroupAdminRecord,
  GroupInviteResult,
  GroupMember,
  GroupScripture,
  PrayerGroup,
  TokenProvider,
} from "../../types";

type ActionKey =
  | "load"
  | "invite"
  | "leave"
  | "delete"
  | "purpose"
  | "scripture:add"
  | "scripture:regenerate"
  | "settings:tradition"
  | "settings:invites"
  | "background"
  | `scripture:remove:${number}`
  | `remove:${string}`;

interface UseGroupDrawerControllerOptions {
  visible: boolean;
  group: PrayerGroup;
  members: GroupMember[];
  tokenProvider: TokenProvider;
  onChanged: () => Promise<void> | void;
  onExit: () => void;
}

const EMPTY_SCRIPTURE: GroupScripture = {
  citation: "",
  text: "",
  reason: "",
};

export function useGroupDrawerController({
  visible,
  group: surfaceGroup,
  members: surfaceMembers,
  tokenProvider,
  onChanged,
  onExit,
}: UseGroupDrawerControllerOptions) {
  const [group, setGroup] = useState<GroupAdminRecord | null>(null);
  const [members, setMembers] = useState(() => sortMembers(surfaceMembers));
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<
    Partial<Record<ActionKey, boolean>>
  >({});
  const [errors, setErrors] = useState<Partial<Record<ActionKey, string>>>({});
  const [inviteResult, setInviteResult] = useState<GroupInviteResult | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [purposeDraft, setPurposeDraft] = useState("");
  const [purposeEditing, setPurposeEditing] = useState(false);
  const [scriptureFormOpen, setScriptureFormOpen] = useState(false);
  const [scriptureDraft, setScriptureDraft] =
    useState<GroupScripture>(EMPTY_SCRIPTURE);

  const visibleRef = useRef(visible);
  const sessionRef = useRef(0);
  const pendingKeys = useRef(new Set<ActionKey>());
  const refreshQueue = useRef<Promise<void>>(Promise.resolve());

  const isCurrentSession = useCallback(
    (session: number) => visibleRef.current && sessionRef.current === session,
    [],
  );

  const requireToken = useCallback(async () => {
    const token = await tokenProvider();
    if (!token) throw new Error("Your session expired. Please sign in again.");
    return token;
  }, [tokenProvider]);

  const clearError = useCallback((key: ActionKey) => {
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const setActionError = useCallback((key: ActionKey, message: string) => {
    setErrors((current) => ({ ...current, [key]: message }));
  }, []);

  const fetchDrawerData = useCallback(
    async (session: number, showLoading: boolean) => {
      if (showLoading && isCurrentSession(session)) setLoading(true);
      if (isCurrentSession(session)) clearError("load");
      try {
        const token = await requireToken();
        const [details, fullMembers] = await Promise.all([
          getGroupAdminDetails(surfaceGroup.groupuuid, token),
          getGroupMembers(surfaceGroup.groupuuid, token),
        ]);
        if (!isCurrentSession(session)) return;
        setGroup(details.group);
        setIsAdmin(details.isAdmin);
        setMembers(sortMembers(fullMembers));
        setPurposeDraft(details.group.purpose || "");
        setPurposeEditing(false);
      } catch (error) {
        if (isCurrentSession(session)) {
          setActionError(
            "load",
            messageFor(error, "Unable to load group settings."),
          );
        }
        throw error;
      } finally {
        if (showLoading && isCurrentSession(session)) setLoading(false);
      }
    },
    [
      clearError,
      isCurrentSession,
      requireToken,
      setActionError,
      surfaceGroup.groupuuid,
    ],
  );

  const queueRefresh = useCallback(
    (session: number, showLoading = false) => {
      const refresh = refreshQueue.current
        .catch(() => undefined)
        .then(() => fetchDrawerData(session, showLoading));
      refreshQueue.current = refresh.catch(() => undefined);
      return refresh;
    },
    [fetchDrawerData],
  );

  useEffect(() => {
    visibleRef.current = visible;
    sessionRef.current += 1;
    const session = sessionRef.current;

    if (visible) {
      setGroup(null);
      setMembers(sortMembers(surfaceMembers));
      setIsAdmin(false);
      setErrors({});
      setPending({});
      setInviteResult(null);
      setCopied(false);
      setPurposeDraft("");
      setPurposeEditing(false);
      setScriptureFormOpen(false);
      setScriptureDraft(EMPTY_SCRIPTURE);
      void queueRefresh(session, true).catch(() => undefined);
      return;
    }

    setErrors({});
    setPending({});
    setInviteResult(null);
    setCopied(false);
    setPurposeDraft("");
    setPurposeEditing(false);
    setScriptureFormOpen(false);
    setScriptureDraft(EMPTY_SCRIPTURE);
  }, [queueRefresh, visible]);

  const refreshAfterWrite = useCallback(
    async (session: number) => {
      await onChanged();
      if (isCurrentSession(session)) {
        await queueRefresh(session).catch(() => undefined);
      }
    },
    [isCurrentSession, onChanged, queueRefresh],
  );

  const runAction = useCallback(
    async <T,>(
      key: ActionKey,
      action: (token: string, session: number) => Promise<T>,
      fallback: string,
    ): Promise<T | undefined> => {
      if (pendingKeys.current.has(key)) return undefined;
      const session = sessionRef.current;
      pendingKeys.current.add(key);
      if (isCurrentSession(session)) {
        setPending((current) => ({ ...current, [key]: true }));
        clearError(key);
      }
      try {
        const token = await requireToken();
        return await action(token, session);
      } catch (error) {
        if (isCurrentSession(session)) {
          setActionError(key, messageFor(error, fallback));
        }
        return undefined;
      } finally {
        pendingKeys.current.delete(key);
        if (isCurrentSession(session)) {
          setPending((current) => {
            const next = { ...current };
            delete next[key];
            return next;
          });
        }
      }
    },
    [clearError, isCurrentSession, requireToken, setActionError],
  );

  const submitInvite = useCallback(
    (
      firstName: string,
      phone: string,
      customMessage: string,
      method: "automatic" | "personal",
    ) => {
      const digits = phone.replace(/\D/g, "");
      if (!firstName.trim() || digits.length < 10) {
        setActionError("invite", "Enter a first name and valid phone number.");
        return;
      }
      const normalized = digits.length === 10 ? `+1${digits}` : `+${digits}`;
      void runAction(
        "invite",
        async (token, session) => {
          const result = await inviteGroupMember(
            surfaceGroup.groupuuid,
            firstName.trim(),
            normalized,
            method === "personal",
            customMessage.trim() || undefined,
            token,
          );
          await refreshAfterWrite(session);
          if (isCurrentSession(session)) {
            setInviteResult(result);
            setCopied(false);
          }
          if (method === "personal") {
            const body = encodeURIComponent(
              `I want to invite you to ${surfaceGroup.name}. ${result.inviteLink}`,
            );
            await Linking.openURL(`sms:${normalized}?body=${body}`);
          }
          return result;
        },
        "Unable to create invitation.",
      );
    },
    [
      isCurrentSession,
      refreshAfterWrite,
      runAction,
      setActionError,
      surfaceGroup.groupuuid,
      surfaceGroup.name,
    ],
  );

  const copyInvite = useCallback(async () => {
    if (!inviteResult) return;
    const session = sessionRef.current;
    try {
      await Clipboard.setStringAsync(inviteResult.inviteLink);
      if (isCurrentSession(session)) setCopied(true);
    } catch (error) {
      if (isCurrentSession(session)) {
        setActionError(
          "invite",
          messageFor(error, "Unable to copy invite link."),
        );
      }
    }
  }, [inviteResult, isCurrentSession, setActionError]);

  const confirmRemove = useCallback(
    (member: GroupMember, name: string) => {
      Alert.alert("Remove member?", `${name} will lose access to this group.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void runAction(
              `remove:${member.memberId}`,
              async (token, session) => {
                await removeGroupMember(
                  surfaceGroup.groupuuid,
                  member.memberId,
                  token,
                );
                await refreshAfterWrite(session);
              },
              "Unable to remove member.",
            );
          },
        },
      ]);
    },
    [refreshAfterWrite, runAction, surfaceGroup.groupuuid],
  );

  const confirmLeave = useCallback(() => {
    Alert.alert(
      "Leave group?",
      `You will no longer have access to ${surfaceGroup.name}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            void runAction(
              "leave",
              async (token) => {
                await leaveGroup(surfaceGroup.groupuuid, token);
                onExit();
              },
              "Unable to leave group.",
            );
          },
        },
      ],
    );
  }, [onExit, runAction, surfaceGroup.groupuuid, surfaceGroup.name]);

  const selectTradition = useCallback(
    (tradition: string) => {
      if (!group || !isAdmin) return;
      void runAction(
        "settings:tradition",
        async (token, session) => {
          await updateGroup(
            group.groupuuid,
            {
              settings: {
                ...group.settings,
                tradition: tradition.toLowerCase(),
              },
            },
            token,
          );
          await refreshAfterWrite(session);
        },
        "Unable to update the group tradition.",
      );
    },
    [group, isAdmin, refreshAfterWrite, runAction],
  );

  const setMemberInvites = useCallback(
    (allowMemberInvites: boolean) => {
      if (!group || !isAdmin) return;
      void runAction(
        "settings:invites",
        async (token, session) => {
          await updateGroup(
            group.groupuuid,
            {
              settings: {
                ...group.settings,
                allowMemberInvites,
              },
            },
            token,
          );
          await refreshAfterWrite(session);
        },
        "Unable to update invitation permissions.",
      );
    },
    [group, isAdmin, refreshAfterWrite, runAction],
  );

  const beginPurposeEdit = useCallback(() => {
    if (!group) return;
    setPurposeDraft(group.purpose || "");
    setPurposeEditing(true);
    clearError("purpose");
  }, [clearError, group]);

  const cancelPurposeEdit = useCallback(() => {
    setPurposeDraft(group?.purpose || "");
    setPurposeEditing(false);
    clearError("purpose");
  }, [clearError, group?.purpose]);

  const savePurpose = useCallback(() => {
    if (!group || !isAdmin) return;
    void runAction(
      "purpose",
      async (token, session) => {
        await updateGroup(
          group.groupuuid,
          { purpose: purposeDraft.trim() || null },
          token,
        );
        await refreshAfterWrite(session);
        if (isCurrentSession(session)) setPurposeEditing(false);
      },
      "Unable to save the group purpose.",
    );
  }, [
    group,
    isAdmin,
    isCurrentSession,
    purposeDraft,
    refreshAfterWrite,
    runAction,
  ]);

  const openScriptureForm = useCallback(() => {
    setScriptureDraft(EMPTY_SCRIPTURE);
    setScriptureFormOpen(true);
    clearError("scripture:add");
  }, [clearError]);

  const closeScriptureForm = useCallback(() => {
    setScriptureDraft(EMPTY_SCRIPTURE);
    setScriptureFormOpen(false);
    clearError("scripture:add");
  }, [clearError]);

  const addScripture = useCallback(() => {
    if (!group || !isAdmin) return;
    const citation = scriptureDraft.citation.trim();
    const text = scriptureDraft.text.trim();
    const reason = scriptureDraft.reason?.trim();
    if (!citation || !text) {
      setActionError("scripture:add", "Citation and verse text are required.");
      return;
    }
    const nextScriptures = [
      ...group.scriptureReferences,
      { citation, text, ...(reason ? { reason } : {}) },
    ];
    void runAction(
      "scripture:add",
      async (token, session) => {
        await updateGroup(
          group.groupuuid,
          { scriptureReferences: nextScriptures },
          token,
        );
        await refreshAfterWrite(session);
        if (isCurrentSession(session)) {
          setScriptureDraft(EMPTY_SCRIPTURE);
          setScriptureFormOpen(false);
        }
      },
      "Unable to add this scripture.",
    );
  }, [
    group,
    isAdmin,
    isCurrentSession,
    refreshAfterWrite,
    runAction,
    scriptureDraft,
    setActionError,
  ]);

  const confirmRemoveScripture = useCallback(
    (index: number, citation: string) => {
      if (!group || !isAdmin) return;
      Alert.alert(
        "Remove scripture?",
        `${citation || "This scripture"} will be removed from the group.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              const nextScriptures = group.scriptureReferences.filter(
                (_, itemIndex) => itemIndex !== index,
              );
              void runAction(
                `scripture:remove:${index}`,
                async (token, session) => {
                  await updateGroup(
                    group.groupuuid,
                    {
                      scriptureReferences: nextScriptures.length
                        ? nextScriptures
                        : null,
                    },
                    token,
                  );
                  await refreshAfterWrite(session);
                },
                "Unable to remove this scripture.",
              );
            },
          },
        ],
      );
    },
    [group, isAdmin, refreshAfterWrite, runAction],
  );

  const regeneratePurpose = useCallback(() => {
    const metadata = group?.creationMetadata;
    if (!group || !isAdmin || !metadata?.groupType) return;
    void runAction(
      "scripture:regenerate",
      async (token, session) => {
        const generated = await previewGroupContent(
          {
            groupType: metadata.groupType,
            contexts: metadata.contexts,
            focuses: metadata.focuses,
          },
          token,
        );
        await updateGroup(
          group.groupuuid,
          {
            purpose: generated.purpose || null,
            scriptureReferences: generated.scriptureReferences.length
              ? generated.scriptureReferences
              : null,
          },
          token,
        );
        await refreshAfterWrite(session);
      },
      "Unable to regenerate purpose and scripture.",
    );
  }, [group, isAdmin, refreshAfterWrite, runAction]);

  const regenerateBackground = useCallback(() => {
    if (!group || !isAdmin) return;
    void runAction(
      "background",
      async (token, session) => {
        const result = await regenerateGroupBackground(group.groupuuid, token);
        if (!result.success) {
          throw new Error(result.error || "The background was not generated.");
        }
        await refreshAfterWrite(session);
      },
      "Unable to regenerate the group background.",
    );
  }, [group, isAdmin, refreshAfterWrite, runAction]);

  const confirmDelete = useCallback(() => {
    if (!group || !isAdmin) return;
    Alert.alert(
      "Delete group?",
      `Delete "${group.name}" permanently? All members will be removed and all group prayers will be unshared.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Group",
          style: "destructive",
          onPress: () => {
            void runAction(
              "delete",
              async (token) => {
                await deleteGroup(group.groupuuid, token);
                onExit();
              },
              "Unable to delete this group.",
            );
          },
        },
      ],
    );
  }, [group, isAdmin, onExit, runAction]);

  return {
    group,
    members,
    isAdmin,
    loading,
    pending,
    errors,
    inviteResult,
    copied,
    purposeDraft,
    purposeEditing,
    scriptureFormOpen,
    scriptureDraft,
    canInvite: Boolean(
      group && (isAdmin || group.settings.allowMemberInvites === true),
    ),
    canLeave: Boolean(group && !isAdmin && surfaceGroup.canLeave),
    canRegeneratePurpose: Boolean(group?.creationMetadata?.groupType),
    clearError,
    submitInvite,
    copyInvite,
    confirmRemove,
    confirmLeave,
    selectTradition,
    setMemberInvites,
    beginPurposeEdit,
    cancelPurposeEdit,
    setPurposeDraft,
    savePurpose,
    openScriptureForm,
    closeScriptureForm,
    setScriptureDraft,
    addScripture,
    confirmRemoveScripture,
    regeneratePurpose,
    regenerateBackground,
    confirmDelete,
  };
}

function sortMembers(members: GroupMember[]) {
  return [...members]
    .filter((member) => member.status === "active" || member.status === "pending")
    .sort((left, right) => {
      const leftRank =
        left.status === "active" ? (left.role === "admin" ? 0 : 1) : 2;
      const rightRank =
        right.status === "active" ? (right.role === "admin" ? 0 : 1) : 2;
      if (leftRank !== rightRank) return leftRank - rightRank;
      const leftDate = left.acceptedAt || left.invitedAt || left.createdAt || "";
      const rightDate =
        right.acceptedAt || right.invitedAt || right.createdAt || "";
      return leftDate.localeCompare(rightDate);
    });
}

function messageFor(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
