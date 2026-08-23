import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  acknowledgeOfferedPrayer,
  blockGroupMember,
  deleteGroupMessage,
  deleteOfferedPrayer,
  generateGroupPrayer,
  getGroupMessages,
  getGroupPrayerCounts,
  getPrayerGroupSurface,
  getPrayerResponses,
  prayForGroupMessage,
  reportGroupContent,
  sendGroupMessage,
} from "../../lib/api";
import { resolveImage } from "../../lib/assets";
import {
  type RealtimeGroupMessage,
  useGroupRealtime,
} from "../../lib/useGroupRealtime";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import type {
  GroupMessage,
  PrayerGroupSurfaceData,
  PrayerIntensity,
  PrayerResponse,
  TokenProvider,
} from "./types";
import { GroupBackground } from "./components/GroupBackground";
import { CogIcon } from "./components/Icons";
import { GroupOverview } from "./components/GroupOverview";
import { InviteSheet } from "./components/InviteSheet";
import { MembersSheet } from "./components/MembersSheet";
import type { ReportReasonId } from "./components/ContentSafetyButton";
import { PrayerRequestView } from "./components/PrayerRequestView";
import { LoadingChiRhoOverlay } from "../../components/ui/LoadingChiRhoOverlay";

async function prefetchGroupImages(result: PrayerGroupSurfaceData) {
  const paths = [
    result.group.backgroundImage,
    ...result.members
      .filter((member) => member.status === "active")
      .slice(0, 5)
      .map((member) => member.profile?.avatar),
  ];
  const uris = Array.from(
    new Set(
      paths
        .map((path) => {
          const source = resolveImage(path);
          return typeof source === "object" &&
            source !== null &&
            "uri" in source &&
            typeof source.uri === "string"
            ? source.uri
            : null;
        })
        .filter((uri): uri is string => Boolean(uri)),
    ),
  );
  if (!uris.length) return;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 2000);
    Promise.allSettled(uris.map((uri) => Image.prefetch(uri))).then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

interface PrayerGroupSurfaceProps {
  groupuuid: string;
  tokenProvider: TokenProvider;
  currentUser: {
    id?: string | null;
    firstName?: string | null;
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
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
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
  const [overviewParticipants, setOverviewParticipants] = useState<
    Record<string, string[]>
  >({});
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [generatedPrayer, setGeneratedPrayer] = useState<string | null>(null);
  const [generatingPrayer, setGeneratingPrayer] = useState(false);
  const [sendingPrayer, setSendingPrayer] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const appliedInitialRoute = useRef(false);
  const blockedIdsRef = useRef<Set<string>>(new Set());

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
        if (!refresh) await prefetchGroupImages(result);
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

  const overviewParticipantKey = data
    ? data.messages
        .slice(-3)
        .map(
          (message) =>
            `${message.messageId}:${data.prayerCounts[message.messageId]?.count ?? 0}`,
        )
        .join("|")
    : "";

  useEffect(() => {
    if (!data || !overviewParticipantKey) return;
    const recent = data.messages.slice(-3);
    let cancelled = false;

    (async () => {
      try {
        const token = await requireToken();
        const entries = await Promise.all(
          recent.map(async (message) => {
            const count = data.prayerCounts[message.messageId]?.count ?? 0;
            if (count <= 0) return [message.messageId, [] as string[]] as const;
            const prayers = await getPrayerResponses(
              groupuuid,
              message.messageId,
              token,
            );
            return [
              message.messageId,
              Array.from(new Set(prayers.map((prayer) => prayer.clerkId))),
            ] as [string, string[]];
          }),
        );
        if (cancelled) return;
        setOverviewParticipants((prev) => {
          const next = { ...prev };
          for (const [id, ids] of entries) next[id] = ids;
          return next;
        });
      } catch {
        // Keep existing participant avatars if the background fetch fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data, groupuuid, overviewParticipantKey, requireToken]);

  const pollActivity = useCallback(async () => {
    try {
      const token = await requireToken();
      const [messages, prayerCounts] = await Promise.all([
        getGroupMessages(groupuuid, token, { limit: 10 }),
        getGroupPrayerCounts(groupuuid, token),
      ]);
      setData((current) => {
        if (!current) return current;
        const merged = mergeMessages(current.messages, messages).filter(
          (item) => !blockedIdsRef.current.has(item.userId),
        );
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
      if (blockedIdsRef.current.has(message.userId)) return;
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
    setOverviewParticipants((prev) => ({
      ...prev,
      [message.messageId]: [
        ...new Set(nextResponses.map((prayer) => prayer.clerkId)),
      ],
    }));
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

  const removeMessageFromDeck = (messageId: string) => {
    if (!data) return;
    const messages = data.messages.filter(
      (item) => item.messageId !== messageId,
    );
    setData({
      ...data,
      messages,
      prayerRequestCount: Math.max(0, data.prayerRequestCount - 1),
    });
    setCurrentIndex(Math.min(currentIndex, Math.max(messages.length - 1, 0)));
    if (!messages.length) setMode("group");
  };

  const handleDeleteRequest = async (message: GroupMessage) => {
    setActionError(null);
    try {
      const token = await requireToken();
      await deleteGroupMessage(groupuuid, message.messageId, token);
      removeMessageFromDeck(message.messageId);
    } catch (err) {
      setActionError(messageFor(err, "Unable to delete this request."));
    }
  };

  const handleReportRequest = async (
    message: GroupMessage,
    reason: ReportReasonId,
  ) => {
    setActionError(null);
    try {
      const token = await requireToken();
      await reportGroupContent(
        groupuuid,
        {
          contentType: "request",
          contentId: message.messageId,
          reason,
        },
        token,
      );
      removeMessageFromDeck(message.messageId);
    } catch (err) {
      setActionError(messageFor(err, "Unable to send this report."));
      throw err;
    }
  };

  const handleDeleteResponse = async (
    message: GroupMessage,
    prayerId: string,
  ) => {
    setActionError(null);
    try {
      const token = await requireToken();
      await deleteOfferedPrayer(groupuuid, prayerId, token);
      setResponses((current) =>
        current.filter((response) => response.prayerId !== prayerId),
      );
      await refreshPrayerState(message);
    } catch (err) {
      setActionError(messageFor(err, "Unable to delete this prayer."));
    }
  };

  const handleReportResponse = async (
    message: GroupMessage,
    prayerId: string,
    reason: ReportReasonId,
  ) => {
    setActionError(null);
    try {
      const token = await requireToken();
      await reportGroupContent(
        groupuuid,
        {
          contentType: "response",
          contentId: prayerId,
          reason,
        },
        token,
      );
      setResponses((current) =>
        current.filter((response) => response.prayerId !== prayerId),
      );
    } catch (err) {
      setActionError(messageFor(err, "Unable to send this report."));
      throw err;
    }
  };

  const handleBlockMember = async (clerkId: string) => {
    setActionError(null);
    try {
      const token = await requireToken();
      await blockGroupMember(clerkId, token);
      blockedIdsRef.current.add(clerkId);
      setResponses((current) =>
        current.filter((response) => response.clerkId !== clerkId),
      );
      if (data) {
        const messages = data.messages.filter(
          (item) => item.userId !== clerkId,
        );
        setData({
          ...data,
          messages,
          prayerRequestCount: messages.length,
        });
        setCurrentIndex(Math.min(currentIndex, Math.max(messages.length - 1, 0)));
        if (!messages.length) setMode("group");
      }
    } catch (err) {
      setActionError(messageFor(err, "Unable to block this person."));
    }
  };

  const handleAcknowledgeOffered = async (
    message: GroupMessage,
    prayerId: string,
  ) => {
    setActionError(null);
    try {
      const token = await requireToken();
      const acknowledgedBy = await acknowledgeOfferedPrayer(
        groupuuid,
        message.messageId,
        prayerId,
        token,
      );
      setResponses((current) =>
        current.map((response) =>
          response.prayerId === prayerId
            ? { ...response, acknowledgedBy }
            : response,
        ),
      );
    } catch (err) {
      setActionError(messageFor(err, "Unable to acknowledge this prayer."));
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
        : "";
      setRequestText(
        await generateGroupPrayer(
          groupuuid,
          {
            type: "request",
            categories,
            memberName: currentUser.firstName,
            requestContext: requestText.trim(),
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
      setData({
        ...data,
        messages,
        prayerRequestCount:
          data.prayerRequestCount +
          (data.messages.some((item) => item.messageId === message.messageId)
            ? 0
            : 1),
      });
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
    if (!data?.group.canCreatePrayerRequests) return;
    setActionError(null);
    setGeneratedPrayer(null);
    setMode("group");
    setRequestOpen(true);
  };

  const openPrayers = (messageId?: string) => {
    setRequestOpen(false);
    setGeneratedPrayer(null);
    setMode("prayers");
    if (!data?.messages.length) return;
    if (messageId) {
      const index = data.messages.findIndex(
        (message) => message.messageId === messageId,
      );
      setCurrentIndex(index >= 0 ? index : data.messages.length - 1);
      return;
    }
    setCurrentIndex(data.messages.length - 1);
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

  if (loading) {
    return (
      <View style={styles.root}>
        <LoadingChiRhoOverlay
          label="Preparing your prayer group…"
          visible
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GroupBackground
        uri={data?.group.backgroundImage || null}
        uris={
          data?.group.backgroundImages?.length
            ? data.group.backgroundImages
            : undefined
        }
      />
      {error && !data ? (
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
              messages={data.messages}
              participantsByMessage={overviewParticipants}
              prayerRequestCount={data.prayerRequestCount}
              refreshing={refreshing}
              requestOpen={requestOpen}
              requestText={requestText}
              generatingRequest={generatingRequest}
              sendingRequest={sendingRequest}
              actionError={actionError}
              onRefresh={() => load(true)}
              onOpenPrayers={() => openPrayers()}
              onOpenPrayer={(messageId) => openPrayers(messageId)}
              onOpenRequest={openRequest}
              onCloseRequest={() => {
                setRequestOpen(false);
                setRequestText("");
              }}
              onRequestTextChange={setRequestText}
              onGenerateRequest={handleGenerateRequest}
              onSubmitRequest={handleSubmitRequest}
              onOpenInvite={() => setInviteOpen(true)}
              onOpenHome={onOpenHome}
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
              actionError={actionError}
              onBack={() => setMode("group")}
              onPrevious={previous}
              onNext={next}
              onPray={handlePray}
              onAcknowledgeOffered={handleAcknowledgeOffered}
              currentUserId={currentUser.id}
              onGenerate={handleGeneratePrayer}
              onChangeGenerated={setGeneratedPrayer}
              onSendGenerated={handleSendGenerated}
              onDismissGenerated={() => setGeneratedPrayer(null)}
              onNewRequest={openRequest}
              canCreatePrayerRequests={data.group.canCreatePrayerRequests}
              isAdmin={data.group.isAdmin}
              onDeleteRequest={handleDeleteRequest}
              onReportRequest={handleReportRequest}
              onDeleteResponse={handleDeleteResponse}
              onReportResponse={handleReportResponse}
              onBlockMember={handleBlockMember}
            />
          )}
          {data.group.isAdmin || data.group.canLeave ? (
            <Pressable
              accessibilityLabel={
                data.group.isAdmin
                  ? `Open ${data.group.name} settings`
                  : `Open ${data.group.name} members`
              }
              accessibilityRole="button"
              onPress={() => setMembersOpen(true)}
              style={({ pressed }) => [
                styles.groupDrawerTrigger,
                { top: insets.top + 10 },
                pressed && styles.groupDrawerTriggerPressed,
              ]}
            >
              <CogIcon color={colors.mutedStrong} size={18} />
            </Pressable>
          ) : null}
          <InviteSheet
            visible={inviteOpen}
            group={data.group}
            tokenProvider={tokenProvider}
            onClose={() => setInviteOpen(false)}
            onChanged={() => load(true)}
          />
          <MembersSheet
            visible={membersOpen}
            group={data.group}
            members={data.members}
            currentUserId={currentUser.id}
            tokenProvider={tokenProvider}
            onClose={() => setMembersOpen(false)}
            onChanged={() => load(true)}
            onExit={() => {
              setMembersOpen(false);
              onLeaveSuccess();
            }}
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

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
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
    backgroundColor: colors.buttonPrimary,
  },
  retryText: { color: colors.buttonOnPrimary, fontFamily: fonts.bodyMedium, fontSize: 11 },
  groupDrawerTrigger: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorderHairline,
    backgroundColor: colors.glassFillHover,
    alignItems: "center",
    justifyContent: "center",
  },
  groupDrawerTriggerPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  });
}
