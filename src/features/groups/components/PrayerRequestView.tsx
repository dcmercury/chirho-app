import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../../../theme/tokens";
import type {
  GroupMember,
  GroupMessage,
  PrayerCount,
  PrayerResponse,
} from "../types";
import {
  BackIcon,
  HeartIcon,
  PlusIcon,
  SparkleIcon,
} from "./Icons";
import { GroupAvatar } from "./GroupAvatar";
import { Stagger } from "./Stagger";

interface PrayerRequestViewProps {
  groupName: string;
  messages: GroupMessage[];
  currentIndex: number;
  members: GroupMember[];
  prayerCounts: Record<string, PrayerCount>;
  responses: PrayerResponse[];
  loadingResponses: boolean;
  generatedPrayer: string | null;
  generatingPrayer: boolean;
  sendingPrayer: boolean;
  hasMoreMessages: boolean;
  loadingOlder: boolean;
  groupAvatar?: string | null;
  actionError: string | null;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPray: (message: GroupMessage) => void;
  onGenerate: (message: GroupMessage) => void;
  onSendGenerated: (message: GroupMessage) => void;
  onDismissGenerated: () => void;
  onNewRequest: () => void;
  onOpenGroupDrawer: () => void;
}

export function PrayerRequestView({
  groupName,
  messages,
  currentIndex,
  members,
  prayerCounts,
  responses,
  loadingResponses,
  generatedPrayer,
  generatingPrayer,
  sendingPrayer,
  hasMoreMessages,
  loadingOlder,
  groupAvatar,
  actionError,
  onBack,
  onPrevious,
  onNext,
  onPray,
  onGenerate,
  onSendGenerated,
  onDismissGenerated,
  onNewRequest,
  onOpenGroupDrawer,
}: PrayerRequestViewProps) {
  const insets = useSafeAreaInsets();
  const safeIndex = Math.min(currentIndex, Math.max(messages.length - 1, 0));
  const message = messages[safeIndex];
  const author = message ? getMember(members, message.userId) : null;
  const authorName = getMemberName(author, message?.userId);
  const prayerState = message
    ? prayerCounts[message.messageId] || { count: 0, userPraying: false }
    : { count: 0, userPraying: false };
  const writtenResponses = responses.filter((response) => response.prayerText);
  const prayingIds = [...new Set(responses.map((response) => response.clerkId))];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 128,
          },
        ]}
      >
        <Pressable onPress={onBack} style={styles.back}>
          <BackIcon color={colors.muted} size={13} />
          <Text style={styles.backText}>{groupName}</Text>
        </Pressable>
        {!message ? (
          <View style={styles.empty}>
            <Text style={styles.label}>{groupName}</Text>
            <Text style={styles.name}>Prayer Requests</Text>
            <Text style={styles.time}>
              No prayer requests yet. Be the first to share.
            </Text>
            <Pressable onPress={onNewRequest} style={[styles.action, styles.orange]}>
              <PlusIcon color={colors.accent} />
            </Pressable>
          </View>
        ) : (
          <View key={message.messageId} style={styles.body}>
            <Stagger delay={200}>
              <Text style={styles.label}>PRAYER REQUEST</Text>
            </Stagger>
            <Stagger delay={300}>
              <View style={styles.nameRow}>
                <GroupAvatar
                  uri={author?.profile?.avatar}
                  name={authorName}
                  size={40}
                  borderColor="rgba(255,255,255,0.15)"
                />
                <Text style={styles.name}>{authorName}</Text>
              </View>
            </Stagger>
            <Stagger delay={400}>
              <Text style={styles.time}>{formatRelativeTime(message.timestamp)}</Text>
            </Stagger>
            <Stagger delay={550}>
              {generatedPrayer ? (
                <View style={styles.generatedBlock}>
                  <Text style={styles.responseLabel}>GENERATED PRAYER</Text>
                  <Text style={styles.generatedText}>{generatedPrayer}</Text>
                  <View style={styles.generatedActions}>
                    <Pressable
                      disabled={sendingPrayer}
                      onPress={() => onSendGenerated(message)}
                      style={[styles.send, sendingPrayer && styles.disabled]}
                    >
                      <Text style={styles.sendText}>
                        {sendingPrayer ? "Sending..." : "Send Prayer"}
                      </Text>
                    </Pressable>
                    <Pressable onPress={onDismissGenerated} style={styles.dismiss}>
                      <Text style={styles.dismissText}>Dismiss</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Text style={styles.request}>{message.content}</Text>
              )}
            </Stagger>

            {loadingResponses ? (
              <ActivityIndicator color={colors.muted} size="small" />
            ) : writtenResponses.length ? (
              <Stagger delay={600}>
                <View style={styles.responses}>
                  <Text style={styles.responseLabel}>
                    {writtenResponses.length} PRAYER
                    {writtenResponses.length === 1 ? "" : "S"} OFFERED
                  </Text>
                  {writtenResponses.map((response, index) => {
                    const responseMember = getMember(members, response.clerkId);
                    const responseName = getMemberName(
                      responseMember,
                      response.clerkId,
                    );
                    return (
                      <View
                        key={`${response.clerkId}-${response.createdAt}-${index}`}
                        style={styles.response}
                      >
                        <View style={styles.responseAuthor}>
                          <GroupAvatar
                            uri={responseMember?.profile?.avatar}
                            name={responseName}
                            size={20}
                            borderColor="rgba(255,255,255,0.15)"
                          />
                          <Text style={styles.responseName}>{responseName}</Text>
                          <Text style={styles.responseTime}>
                            {formatRelativeTime(response.createdAt)}
                          </Text>
                        </View>
                        <Text style={styles.responseText}>
                          {response.prayerText}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Stagger>
            ) : null}

            {prayingIds.length ? (
              <Stagger delay={700}>
                <Text style={styles.responseLabel}>
                  {prayingIds.length} PRAYING
                </Text>
                <View style={styles.praying}>
                  {prayingIds.map((id, index) => {
                    const member = getMember(members, id);
                    const name = getMemberName(member, id);
                    return (
                      <GroupAvatar
                        key={id}
                        uri={member?.profile?.avatar}
                        name={name}
                        size={32}
                        style={index ? styles.overlap : undefined}
                      />
                    );
                  })}
                </View>
              </Stagger>
            ) : prayerState.count ? (
              <Text style={styles.responseLabel}>{prayerState.count} PRAYING</Text>
            ) : null}

            <Stagger delay={750}>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => onPray(message)}
                  style={[
                    styles.action,
                    prayerState.userPraying && styles.actionActive,
                  ]}
                >
                  <HeartIcon
                    color={
                      prayerState.userPraying ? colors.accent : colors.mutedStrong
                    }
                    fill={prayerState.userPraying ? colors.accent : "none"}
                  />
                </Pressable>
                <Pressable
                  disabled={generatingPrayer}
                  onPress={() => onGenerate(message)}
                  style={[styles.action, generatingPrayer && styles.disabled]}
                >
                  {generatingPrayer ? (
                    <ActivityIndicator color={colors.mutedStrong} size="small" />
                  ) : (
                    <SparkleIcon color={colors.mutedStrong} />
                  )}
                </Pressable>
                <Pressable
                  onPress={onNewRequest}
                  style={[styles.action, styles.orange]}
                >
                  <PlusIcon color={colors.accent} />
                </Pressable>
              </View>
            </Stagger>
            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
          </View>
        )}
      </ScrollView>
      {message ? (
        <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <NavButton
            label="PREV"
            disabled={safeIndex === 0 && !hasMoreMessages}
            loading={loadingOlder}
            onPress={onPrevious}
          />
          <Pressable
            accessibilityLabel={`Open ${groupName} members and settings`}
            accessibilityRole="button"
            onPress={onOpenGroupDrawer}
            style={styles.center}
          >
            <GroupAvatar
              uri={groupAvatar}
              name={groupName}
              size={72}
              borderColor="rgba(255,255,255,0.15)"
            />
            <Text style={styles.counter}>
              {safeIndex + 1} / {messages.length}
            </Text>
          </Pressable>
          <NavButton
            label="NEXT"
            disabled={safeIndex >= messages.length - 1}
            onPress={onNext}
          />
          <View style={styles.handle} />
        </View>
      ) : null}
    </View>
  );
}

function NavButton({
  label,
  disabled,
  loading = false,
  onPress,
}: {
  label: string;
  disabled: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.navButton, disabled && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.mutedStrong} size="small" />
      ) : (
        <Text style={styles.navLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

function getMember(members: GroupMember[], userId: string) {
  return members.find((member) => member.clerkuuid === userId) || null;
}

function getMemberName(member: GroupMember | null, fallback?: string) {
  const name = [member?.profile?.firstName || member?.firstName, member?.profile?.lastName]
    .filter(Boolean)
    .join(" ");
  return name || fallback?.slice(0, 8) || "Member";
}

function formatRelativeTime(value: string) {
  const milliseconds = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingVertical: 4,
    marginBottom: 8,
  },
  backText: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  body: { gap: 12 },
  empty: { gap: 12 },
  label: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 10.4,
    letterSpacing: 0.62,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: {
    flexShrink: 1,
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -0.8,
  },
  time: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: fonts.body,
    fontSize: 12.8,
    lineHeight: 20,
    fontStyle: "italic",
  },
  request: {
    maxWidth: "95%",
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    color: "rgba(220,220,220,0.85)",
    fontFamily: fonts.body,
    fontSize: 15.2,
    lineHeight: 27.4,
  },
  responses: { gap: 12, marginTop: 4 },
  responseLabel: {
    color: colors.mutedGhost,
    fontFamily: fonts.mono,
    fontSize: 8.8,
    letterSpacing: 0.7,
  },
  response: {
    gap: 4,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: colors.glassBorderSoft,
  },
  responseAuthor: { flexDirection: "row", alignItems: "center", gap: 6 },
  responseName: {
    color: colors.mutedSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  responseTime: {
    color: "rgba(255,255,255,0.25)",
    fontFamily: fonts.body,
    fontSize: 9.6,
    fontStyle: "italic",
  },
  responseText: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: fonts.body,
    fontSize: 12.8,
    lineHeight: 20,
    fontStyle: "italic",
  },
  praying: { flexDirection: "row", marginTop: 8 },
  overlap: { marginLeft: -6 },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  action: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  actionActive: {
    borderColor: "rgba(249,115,22,0.3)",
    backgroundColor: "rgba(249,115,22,0.15)",
  },
  orange: {
    marginLeft: "auto",
    borderColor: "rgba(249,115,22,0.4)",
    backgroundColor: "rgba(249,115,22,0.15)",
  },
  generatedBlock: { gap: 8 },
  generatedText: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.15)",
    backgroundColor: "rgba(249,115,22,0.06)",
    color: colors.subtitle,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 19,
    fontStyle: "italic",
  },
  generatedActions: { flexDirection: "row", gap: 8 },
  send: {
    flex: 1,
    alignItems: "center",
    padding: 9,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  sendText: { color: colors.white, fontFamily: fonts.bodyMedium, fontSize: 11 },
  dismiss: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  dismissText: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  nav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  navButton: {
    width: 46,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  navLabel: {
    color: colors.mutedStrong,
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  center: { alignItems: "center", gap: 3 },
  counter: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: fonts.mono,
    fontSize: 8.8,
    letterSpacing: 0.5,
  },
  handle: {
    position: "absolute",
    bottom: 3,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  error: { color: colors.error, fontFamily: fonts.body, fontSize: 11 },
  disabled: { opacity: 0.3 },
});
