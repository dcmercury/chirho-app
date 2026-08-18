import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  generateGroupPrayer,
  getGroupMessages,
  getGroupPrayerCounts,
  getPrayerGroupSurface,
  getPrayerResponses,
  inviteGroupMember,
  leaveGroup,
  prayForGroupMessage,
  removeGroupMember,
  sendGroupMessage,
} from "../../lib/api";
import {
  type RealtimeGroupMessage,
  useGroupRealtime,
} from "../../lib/useGroupRealtime";
import { colors, fonts } from "../../theme/tokens";
import type {
  GroupInviteResult,
  GroupMessage,
  PrayerGroupSurfaceData,
  PrayerIntensity,
  PrayerResponse,
  TokenProvider,
} from "./types";
import { GroupBackground } from "./components/GroupBackground";
import { GroupOverview } from "./components/GroupOverview";
import { MembersSheet } from "./components/MembersSheet";
import { PrayerRequestView } from "./components/PrayerRequestView";

interface PrayerGroupSurfaceProps {
  groupuuid: string;
  tokenProvider: TokenProvider;
  currentUser: {
    id?: string | null;
    firstName?: string | null;
    avatar?: string | null;
  };
  initialMessageId?: string;
  initialRequestOpen?: boolean;
  onLeaveSuccess: () => void;
  onOpenHome: () => void;
}

export function PrayerGroupSurface({
  groupuuid,
  tokenProvider,
  currentUser,
  initialMessageId,
  initialRequestOpen = false,
  onLeaveSuccess,
  onOpenHome,
}: PrayerGroupSurfaceProps) {
  const [data, setData] = useState<PrayerGroupSurfaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mode, setMode] = useState<"group" | "prayers">("group");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [generatingRequest, setGeneratingRequest] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [responses, setResponses] = useState<PrayerResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [generatedPrayer, setGeneratedPrayer] = useState<string | null>(null);
  const [generatingPrayer, setGeneratingPrayer] = useState(false);
  const [sendingPrayer, setSendingPrayer] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const appliedInitialRoute = useRef(false);

  const requireToken = useCallback(async () => {
    const token = await tokenProvider();
    if (!token) throw new Error("Your session expired. Please sign in again.");
    return token;
  }, [tokenProvider]);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const token = await requireToken();
        const result = await getPrayerGroupSurface(groupuuid, token);
        setData(result);
        setCurrentIndex((index) =>
          result.messages.length
            ? Math.min(index || result.messages.length - 1, result.messages.length - 1)
            : 0,
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load this prayer group.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [groupuuid, requireToken],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data || appliedInitialRoute.current) return;
    appliedInitialRoute.current = true;
    if (initialRequestOpen) {
      setMode("group");
      setRequestOpen(true);
      return;
    }
    if (initialMessageId) {
      const index = data.messages.findIndex(
        (message) => message.messageId === initialMessageId,
      );
      setCurrentIndex(index >= 0 ? index : Math.max(data.messages.length - 1, 0));
      setMode("prayers");
    }
  }, [data, initialMessageId, initialRequestOpen]);

  const pollActivity = useCallback(async () => {
    try {
      const token = await requireToken();
      const [messages, prayerCounts] = await Promise.all([
        getGroupMessages(groupuuid, token, { limit: 10 }),
        getGroupPrayerCounts(groupuuid, token),
      ]);
      setData((current) => {
        if (!current) return current;
        const merged = mergeMessages(current.messages, messages);
        return {
          ...current,
          messages: merged,
          prayerCounts,
          hasMoreMessages:
            current.hasMoreMessages || messages.length >= 10,
        };
      });
    } catch {
      // Background polling is best effort; explicit refresh surfaces errors.
    }
  }, [groupuuid, requireToken]);

  const handleRealtimeMessage = useCallback(
    (message: RealtimeGroupMessage) => {
      setData((current) =>
        current
          ? {
              ...current,
              messages: mergeMessages(current.messages, [
                {
                  messageId: message.messageId,
                  groupUuid: message.groupUuid,
                  userId: message.userId,
                  content: message.content,
                  timestamp: message.timestamp,
                  sequenceNumber: message.sequenceNumber,
                },
              ]),
            }
          : current,
      );
    },
    [],
  );

  const handlePrayerUpdate = useCallback(
    (update: {
      messageId: string;
      count: number;
      userPraying: boolean;
    }) => {
      setData((current) =>
        current
          ? {
              ...current,
              prayerCounts: {
                ...current.prayerCounts,
                [update.messageId]: {
                  count: update.count,
                  userPraying: update.userPraying,
                },
              },
            }
          : current,
      );
    },
    [],
  );

  const { connected } = useGroupRealtime({
    groupuuid,
    onMessage: handleRealtimeMessage,
    onPrayerUpdate: handlePrayerUpdate,
  });

  useEffect(() => {
    const interval = setInterval(pollActivity, connected ? 60_000 : 20_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") pollActivity();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [connected, pollActivity]);

  const selectedMessage = data?.messages[currentIndex];
  const loadResponses = useCallback(
    async (message: GroupMessage) => {
      setLoadingResponses(true);
      try {
        const token = await requireToken();
        setResponses(
          await getPrayerResponses(groupuuid, message.messageId, token),
        );
      } catch {
        setResponses([]);
      } finally {
        setLoadingResponses(false);
      }
    },
    [groupuuid, requireToken],
  );

  useEffect(() => {
    if (mode !== "prayers" || !selectedMessage) {
      setResponses([]);
      return;
    }
    loadResponses(selectedMessage);
  }, [loadResponses, mode, selectedMessage]);

  const refreshPrayerState = async (message: GroupMessage) => {
    const token = await requireToken();
    const [prayerCounts, nextResponses] = await Promise.all([
      getGroupPrayerCounts(groupuuid, token),
      getPrayerResponses(groupuuid, message.messageId, token),
    ]);
    setData((current) =>
      current ? { ...current, prayerCounts } : current,
    );
    setResponses(nextResponses);
  };

  const handlePray = async (message: GroupMessage) => {
    setActionError(null);
    try {
      const token = await requireToken();
      await prayForGroupMessage(groupuuid, message.messageId, token);
      await refreshPrayerState(message);
    } catch (err) {
      setActionError(messageFor(err, "Unable to save your prayer."));
    }
  };

  const handleGeneratePrayer = async (message: GroupMessage) => {
    setGeneratingPrayer(true);
    setGeneratedPrayer(null);
    setActionError(null);
    try {
      const token = await requireToken();
      const author = data?.members.find(
        (member) => member.clerkuuid === message.userId,
      );
      setGeneratedPrayer(
        await generateGroupPrayer(
          groupuuid,
          {
            type: "response",
            prayerRequest: message.content,
            memberName: author?.profile?.firstName || author?.firstName || null,
            categories: author?.prayerCategories,
          },
          token,
        ),
      );
    } catch (err) {
      setActionError(messageFor(err, "Unable to write a prayer."));
    } finally {
      setGeneratingPrayer(false);
    }
  };

  const handleSendGenerated = async (message: GroupMessage) => {
    if (!generatedPrayer) return;
    setSendingPrayer(true);
    setActionError(null);
    try {
      const token = await requireToken();
      await prayForGroupMessage(
        groupuuid,
        message.messageId,
        token,
        generatedPrayer,
      );
      setGeneratedPrayer(null);
      await refreshPrayerState(message);
    } catch (err) {
      setActionError(messageFor(err, "Unable to send this prayer."));
    } finally {
      setSendingPrayer(false);
    }
  };

  const handleGenerateRequest = async (intensities: PrayerIntensity[]) => {
    if (!data) return;
    setGeneratingRequest(true);
    setActionError(null);
    try {
      const token = await requireToken();
      const categories = intensities.length
        ? intensities
            .map(({ category, intensity }) => `${category} (${intensity}/10)`)
            .join(", ")
        : "general life needs";
      setRequestText(
        await generateGroupPrayer(
          groupuuid,
          {
            type: "request",
            categories,
            memberName: currentUser.firstName,
            groupPurpose: data.group.purpose,
            groupName: data.group.name,
          },
          token,
        ),
      );
    } catch (err) {
      setActionError(messageFor(err, "Unable to write a prayer request."));
    } finally {
      setGeneratingRequest(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestText.trim() || !data) return;
    setSendingRequest(true);
    setActionError(null);
    try {
      const token = await requireToken();
      const message = await sendGroupMessage(
        groupuuid,
        requestText.trim(),
        token,
      );
      const messages = mergeMessages(data.messages, [message]);
      setData({ ...data, messages });
      setCurrentIndex(
        messages.findIndex((item) => item.messageId === message.messageId),
      );
      setRequestText("");
      setRequestOpen(false);
      setMode("prayers");
    } catch (err) {
      setActionError(messageFor(err, "Unable to share this request."));
    } finally {
      setSendingRequest(false);
    }
  };

  const openRequest = () => {
    setActionError(null);
    setGeneratedPrayer(null);
    setMode("group");
    setRequestOpen(true);
  };

  const openPrayers = () => {
    setRequestOpen(false);
    setGeneratedPrayer(null);
    setMode("prayers");
    if (data?.messages.length) setCurrentIndex(data.messages.length - 1);
  };

  const previous = async () => {
    if (!data) return;
    if (currentIndex > 0) {
      setGeneratedPrayer(null);
      setCurrentIndex(currentIndex - 1);
      return;
    }
    if (!data.hasMoreMessages || !data.messages.length) return;
    setLoadingOlder(true);
    try {
      const token = await requireToken();
      const older = await getGroupMessages(groupuuid, token, {
        limit: 10,
        before: data.messages[0].timestamp,
      });
      const messages = mergeMessages(older, data.messages);
      setData({
        ...data,
        messages,
        hasMoreMessages: older.length >= 10,
      });
      setCurrentIndex(Math.max(older.length - 1, 0));
    } catch (err) {
      setActionError(messageFor(err, "Unable to load earlier requests."));
    } finally {
      setLoadingOlder(false);
    }
  };

  const next = () => {
    if (!data || currentIndex >= data.messages.length - 1) return;
    setGeneratedPrayer(null);
    setCurrentIndex(currentIndex + 1);
  };

  const invite = async (
    firstName: string,
    phone: string,
    personal: boolean,
  ): Promise<GroupInviteResult> => {
    const token = await requireToken();
    const result = await inviteGroupMember(
      groupuuid,
      firstName,
      phone,
      personal,
      token,
    );
    await load(true);
    return result;
  };

  const leave = async () => {
    const token = await requireToken();
    await leaveGroup(groupuuid, token);
    setMembersOpen(false);
    onLeaveSuccess();
  };

  const remove = async (memberId: string) => {
    const token = await requireToken();
    await removeGroupMember(groupuuid, memberId, token);
    setData((current) =>
      current
        ? {
            ...current,
            members: current.members.filter(
              (member) => member.memberId !== memberId,
            ),
          }
        : current,
    );
  };

  return (
    <View style={styles.root}>
      <GroupBackground uri={data?.group.backgroundImage || null} />
      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loading}>Loading prayer group…</Text>
        </View>
      ) : error && !data ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : data ? (
        <>
          {mode === "group" ? (
            <GroupOverview
              group={data.group}
              members={data.members}
              refreshing={refreshing}
              requestOpen={requestOpen}
              requestText={requestText}
              generatingRequest={generatingRequest}
              sendingRequest={sendingRequest}
              actionError={actionError}
              onRefresh={() => load(true)}
              onOpenPrayers={openPrayers}
              onOpenRequest={openRequest}
              onCloseRequest={() => {
                setRequestOpen(false);
                setRequestText("");
              }}
              onRequestTextChange={setRequestText}
              onGenerateRequest={handleGenerateRequest}
              onSubmitRequest={handleSubmitRequest}
              onOpenMembers={() => setMembersOpen(true)}
            />
          ) : (
            <PrayerRequestView
              groupName={data.group.name}
              messages={data.messages}
              currentIndex={currentIndex}
              members={data.members}
              prayerCounts={data.prayerCounts}
              responses={responses}
              loadingResponses={loadingResponses}
              generatedPrayer={generatedPrayer}
              generatingPrayer={generatingPrayer}
              sendingPrayer={sendingPrayer}
              hasMoreMessages={data.hasMoreMessages}
              loadingOlder={loadingOlder}
              currentUserAvatar={currentUser.avatar}
              actionError={actionError}
              onBack={() => setMode("group")}
              onPrevious={previous}
              onNext={next}
              onPray={handlePray}
              onGenerate={handleGeneratePrayer}
              onSendGenerated={handleSendGenerated}
              onDismissGenerated={() => setGeneratedPrayer(null)}
              onNewRequest={openRequest}
              onCenterAvatar={onOpenHome}
            />
          )}
          <MembersSheet
            visible={membersOpen}
            group={data.group}
            members={data.members}
            currentUserId={currentUser.id}
            onClose={() => setMembersOpen(false)}
            onInvite={invite}
            onLeave={leave}
            onRemove={remove}
          />
        </>
      ) : null}
    </View>
  );
}

function mergeMessages(existing: GroupMessage[], incoming: GroupMessage[]) {
  const byId = new Map<string, GroupMessage>();
  [...existing, ...incoming].forEach((message) =>
    byId.set(message.messageId, {
      ...message,
      timestamp: String(message.timestamp),
    }),
  );
  return [...byId.values()].sort(
    (a, b) =>
      a.sequenceNumber - b.sequenceNumber ||
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

function messageFor(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  loading: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  retry: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  retryText: { color: colors.black, fontFamily: fonts.bodyMedium, fontSize: 11 },
});
