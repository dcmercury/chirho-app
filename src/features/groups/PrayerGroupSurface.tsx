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
  generateGroupPrayer,
  getGroupMessages,
  getGroupPrayerCounts,
  getPrayerGroupSurface,
  getPrayerResponses,
  prayForGroupMessage,
  sendGroupMessage,
} from "../../lib/api";
import { resolveImage } from "../../lib/assets";
import {
  type RealtimeGroupMessage,
  useGroupRealtime,
} from "../../lib/useGroupRealtime";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../../theme/tokens";
import type {
  GroupMessage,
  PrayerGroupSurfaceData,
  PrayerIntensity,
  PrayerResponse,
  TokenProvider,
} from "./types";
import { GroupBackground } from "./components/GroupBackground";
import { GroupAvatar } from "./components/GroupAvatar";
import { GroupOverview } from "./components/GroupOverview";
import { MembersSheet } from "./components/MembersSheet";
import { PrayerRequestView } from "./components/PrayerRequestView";
import { LoadingChiRhoOverlay } from "../../components/ui/LoadingChiRhoOverlay";

const chiRhoIcon = require("../../../assets/onboarding/chirho.svg");

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
      <GroupBackground uri={data?.group.backgroundImage || null} />
      {error && !data ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : data ? (
        <>
          <Pressable
            accessibilityHint="Returns to the home screen"
            accessibilityLabel="Open home"
            accessibilityRole="button"
            onPress={onOpenHome}
            style={({ pressed }) => [
              styles.homeButton,
              { top: insets.top + 10 },
              pressed && styles.homeButtonPressed,
            ]}
          >
            <Image
              accessible={false}
              contentFit="contain"
              source={chiRhoIcon}
              style={styles.homeIcon}
            />
          </Pressable>
          {mode === "group" ? (
            <GroupOverview
              group={data.group}
              members={data.members}
              prayerRequestCount={data.prayerRequestCount}
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
              groupAvatar={data.group.backgroundImage}
              actionError={actionError}
              onBack={() => setMode("group")}
              onPrevious={previous}
              onNext={next}
              onPray={handlePray}
              onGenerate={handleGeneratePrayer}
              onSendGenerated={handleSendGenerated}
              onDismissGenerated={() => setGeneratedPrayer(null)}
              onNewRequest={openRequest}
              onOpenGroupDrawer={() => setMembersOpen(true)}
            />
          )}
          {mode === "group" || data.messages.length === 0 ? (
            <Pressable
              accessibilityLabel={`Open ${data.group.name} members and settings`}
              accessibilityRole="button"
              onPress={() => setMembersOpen(true)}
              style={({ pressed }) => [
                styles.groupDrawerTrigger,
                { bottom: Math.max(insets.bottom, 12) },
                pressed && styles.groupDrawerTriggerPressed,
              ]}
            >
              <GroupAvatar
                borderColor="rgba(255,255,255,0.18)"
                name={data.group.name}
                size={72}
                uri={data.group.backgroundImage}
              />
            </Pressable>
          ) : null}
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

const styles = StyleSheet.create({
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
    backgroundColor: colors.white,
  },
  retryText: { color: colors.black, fontFamily: fonts.bodyMedium, fontSize: 11 },
  homeButton: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(255,248,240,0.36)",
    backgroundColor: "rgba(255,248,240,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  homeIcon: {
    width: 18,
    height: 24,
  },
  homeButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  groupDrawerTrigger: {
    position: "absolute",
    left: "50%",
    marginLeft: -36,
  },
  groupDrawerTriggerPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
});
