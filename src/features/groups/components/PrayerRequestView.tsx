import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { fonts, type ColorTokens } from "../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../theme/ThemeProvider";
import { SwipeChevron } from "../../../components/ui/SwipeChevron";
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
import { ContentSafetyButton } from "./ContentSafetyButton";
import type { ReportReasonId } from "./ContentSafetyButton";
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
  actionError: string | null;
  currentUserId?: string | null;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPray: (message: GroupMessage) => void;
  onAcknowledgeOffered: (message: GroupMessage, prayerId: string) => void;
  onGenerate: (message: GroupMessage) => void;
  onChangeGenerated: (text: string) => void;
  onSendGenerated: (message: GroupMessage) => void;
  onDismissGenerated: () => void;
  onNewRequest: () => void;
  canCreatePrayerRequests?: boolean;
  isAdmin?: boolean;
  onDeleteRequest: (message: GroupMessage) => void;
  onReportRequest: (message: GroupMessage, reason: ReportReasonId) => void;
  onDeleteResponse: (message: GroupMessage, prayerId: string) => void;
  onReportResponse: (
    message: GroupMessage,
    prayerId: string,
    reason: ReportReasonId,
  ) => void;
  onBlockMember: (clerkId: string) => void;
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
  actionError,
  currentUserId,
  onBack,
  onPrevious,
  onNext,
  onPray,
  onAcknowledgeOffered,
  onGenerate,
  onChangeGenerated,
  onSendGenerated,
  onDismissGenerated,
  onNewRequest,
  canCreatePrayerRequests = true,
  isAdmin = false,
  onDeleteRequest,
  onReportRequest,
  onDeleteResponse,
  onReportResponse,
  onBlockMember,
}: PrayerRequestViewProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { colors, appearance } = useTheme();
  const safeIndex = Math.min(currentIndex, Math.max(messages.length - 1, 0));
  const message = messages[safeIndex];
  const author = message ? getMember(members, message.userId) : null;
  const authorName = getMemberName(author, message?.userId);
  const prayerState = message
    ? prayerCounts[message.messageId] || { count: 0, userPraying: false }
    : { count: 0, userPraying: false };
  const writtenResponses = responses.filter((response) => response.prayerText);
  const prayingIds = [...new Set(responses.map((response) => response.clerkId))];
  const canGoPrevious = safeIndex > 0 || hasMoreMessages;
  const canGoNext = safeIndex < messages.length - 1;
  const scrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const touchStartRef = useRef<{
    pageY: number;
    canGoPrevious: boolean;
    canGoNext: boolean;
  } | null>(null);

  const handleTouchStart = (pageY: number) => {
    const offset = scrollOffsetRef.current;
    const viewportHeight = viewportHeightRef.current;
    const contentHeight = contentHeightRef.current;
    const contentFits = contentHeight <= viewportHeight + 4;
    touchStartRef.current = {
      pageY,
      canGoPrevious: canGoPrevious && (contentFits || offset <= 4),
      canGoNext:
        canGoNext &&
        (contentFits || offset + viewportHeight >= contentHeight - 4),
    };
  };

  const handleTouchEnd = (pageY: number) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const deltaY = pageY - start.pageY;
    if (deltaY <= -56 && start.canGoNext) {
      onNext();
    } else if (deltaY >= 56 && start.canGoPrevious) {
      onPrevious();
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        alwaysBounceVertical={false}
        bounces={!(canGoPrevious || canGoNext)}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 56,
            paddingBottom: insets.bottom + 72,
          },
        ]}
        onContentSizeChange={(_, height) => {
          contentHeightRef.current = height;
        }}
        onLayout={(event) => {
          viewportHeightRef.current = event.nativeEvent.layout.height;
        }}
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        onTouchCancel={() => {
          touchStartRef.current = null;
        }}
        onTouchEnd={(event) => handleTouchEnd(event.nativeEvent.pageY)}
        onTouchStart={(event) => handleTouchStart(event.nativeEvent.pageY)}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
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
            {canCreatePrayerRequests ? (
              <Pressable onPress={onNewRequest} style={[styles.action, styles.orange]}>
                <PlusIcon color={colors.accent} />
              </Pressable>
            ) : null}
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
                  borderColor={colors.glassBorderRow}
                />
                <Text style={styles.name}>{authorName}</Text>
                {currentUserId ? (
                  <ContentSafetyButton
                    authorName={authorName}
                    contentLabel="prayer request"
                    isAdmin={isAdmin}
                    isOwn={message.userId === currentUserId}
                    onBlock={() => onBlockMember(message.userId)}
                    onDelete={() => onDeleteRequest(message)}
                    onReport={(reason) => onReportRequest(message, reason)}
                  />
                ) : null}
              </View>
            </Stagger>
            <Stagger delay={400}>
              <Text style={styles.time}>{formatRelativeTime(message.timestamp)}</Text>
            </Stagger>
            <Stagger delay={550}>
              {generatedPrayer ? (
                <View style={styles.generatedBlock}>
                  <Text style={styles.responseLabel}>GENERATED PRAYER</Text>
                  <TextInput
                    editable={!sendingPrayer}
                    multiline
                    onChangeText={onChangeGenerated}
                    keyboardAppearance={appearance === "light" ? "light" : "dark"}
                    style={styles.generatedText}
                    textAlignVertical="top"
                    value={generatedPrayer}
                  />
                  <View style={styles.generatedActions}>
                    <Pressable
                      disabled={sendingPrayer || !generatedPrayer.trim()}
                      onPress={() => onSendGenerated(message)}
                      style={[
                        styles.send,
                        (sendingPrayer || !generatedPrayer.trim()) &&
                          styles.disabled,
                      ]}
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
                    const acknowledgers = response.acknowledgedBy || [];
                    const displayIds = currentUserId
                      ? [
                          currentUserId,
                          ...acknowledgers.filter((id) => id !== currentUserId),
                        ]
                      : acknowledgers;
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
                            borderColor={colors.glassBorderRow}
                          />
                          <Text style={styles.responseName}>{responseName}</Text>
                          <Text style={styles.responseTime}>
                            {formatRelativeTime(response.createdAt)}
                          </Text>
                          {currentUserId && response.prayerId ? (
                            <ContentSafetyButton
                              authorName={responseName}
                              contentLabel="prayer"
                              isAdmin={isAdmin}
                              isOwn={response.clerkId === currentUserId}
                              onBlock={() => onBlockMember(response.clerkId)}
                              onDelete={() =>
                                onDeleteResponse(message, response.prayerId!)
                              }
                              onReport={(reason) =>
                                onReportResponse(
                                  message,
                                  response.prayerId!,
                                  reason,
                                )
                              }
                            />
                          ) : null}
                        </View>
                        <CollapsiblePrayerText text={response.prayerText || ""} />
                        {displayIds.length ? (
                          <View style={styles.acknowledgeRow}>
                            {displayIds.map((id, avatarIndex) => {
                              const member = getMember(members, id);
                              const name = getMemberName(member, id);
                              const acknowledged = acknowledgers.includes(id);
                              const isCurrentUser = id === currentUserId;
                              const avatar = (
                                <View
                                  style={[
                                    styles.acknowledger,
                                    avatarIndex ? styles.overlap : undefined,
                                  ]}
                                >
                                  <GroupAvatar
                                    uri={member?.profile?.avatar}
                                    name={name}
                                    size={26}
                                    borderColor={colors.glassBorderChip}
                                  />
                                  <View
                                    style={[
                                      styles.heartBadge,
                                      !acknowledged && styles.heartBadgeMuted,
                                    ]}
                                  >
                                    <HeartIcon
                                      color={
                                        acknowledged
                                          ? colors.accent
                                          : colors.mutedStrong
                                      }
                                      fill={
                                        acknowledged ? colors.accent : "none"
                                      }
                                      size={7}
                                    />
                                  </View>
                                </View>
                              );
                              if (isCurrentUser && response.prayerId) {
                                return (
                                  <Pressable
                                    key={id}
                                    accessibilityLabel={
                                      acknowledged
                                        ? "Remove acknowledgment"
                                        : "Acknowledge this prayer"
                                    }
                                    accessibilityRole="button"
                                    hitSlop={6}
                                    onPress={() =>
                                      onAcknowledgeOffered(
                                        message,
                                        response.prayerId!,
                                      )
                                    }
                                  >
                                    {avatar}
                                  </Pressable>
                                );
                              }
                              return <View key={id}>{avatar}</View>;
                            })}
                          </View>
                        ) : null}
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
                {canCreatePrayerRequests ? (
                  <Pressable
                    onPress={onNewRequest}
                    style={[styles.action, styles.orange]}
                  >
                    <PlusIcon color={colors.accent} />
                  </Pressable>
                ) : null}
              </View>
            </Stagger>
            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
            {canGoPrevious ? (
              <View style={styles.swipeNavigationBottom}>
                <SwipeChevron
                  accessibilityLabel="Previous prayer request, swipe down"
                  direction="down"
                  loading={loadingOlder}
                  onPress={onPrevious}
                />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
      {canGoNext ? (
        <View
          style={[
            styles.swipeNavigationTop,
            { top: Math.max(insets.top, 12) + 6 },
          ]}
        >
          <SwipeChevron
            accessibilityLabel="Next prayer request, swipe up"
            direction="up"
            onPress={onNext}
          />
        </View>
      ) : null}
      {message ? (
        <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Text style={styles.counter}>
            {safeIndex + 1} / {messages.length} · Swipe
          </Text>
          <View style={styles.handle} />
        </View>
      ) : null}
    </View>
  );
}

const COLLAPSED_PRAYER_LINES = 3;

function CollapsiblePrayerText({ text }: { text: string }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  return (
    <View>
      <Text
        numberOfLines={expanded ? undefined : COLLAPSED_PRAYER_LINES}
        onTextLayout={(event) => {
          if (event.nativeEvent.lines.length >= COLLAPSED_PRAYER_LINES) {
            setCanExpand(true);
          }
        }}
        style={styles.responseText}
      >
        {text}
      </Text>
      {canExpand ? (
        <Pressable
          accessibilityLabel={expanded ? "Show less prayer" : "Read more prayer"}
          accessibilityRole="button"
          hitSlop={6}
          onPress={() => setExpanded((open) => !open)}
          style={styles.readMore}
        >
          <Text style={styles.readMoreText}>
            {expanded ? "Show less" : "Read more"}
          </Text>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <Path
              d={expanded ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"}
              stroke={colors.mutedStrong}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      ) : null}
    </View>
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

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
    color: colors.accentText,
    fontFamily: fonts.mono,
    fontSize: 10.4,
    letterSpacing: 0.62,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: {
    flex: 1,
    flexShrink: 1,
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -0.8,
  },
  time: {
    color: colors.mutedMid,
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
    color: colors.bodyOnPhoto,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingLeft: 16,
    borderRadius: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.glassBorderSoft,
    backgroundColor: colors.cardFill,
  },
  responseAuthor: { flexDirection: "row", alignItems: "center", gap: 6 },
  responseName: {
    flexShrink: 1,
    color: colors.mutedSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  responseTime: {
    color: colors.mutedDeep,
    fontFamily: fonts.body,
    fontSize: 9.6,
    fontStyle: "italic",
  },
  responseText: {
    color: colors.bodyOnPhoto,
    fontFamily: fonts.body,
    fontSize: 12.8,
    lineHeight: 20,
    fontStyle: "italic",
  },
  readMore: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 6,
    paddingVertical: 2,
  },
  readMoreText: {
    color: colors.mutedStrong,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  acknowledgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    minHeight: 28,
  },
  acknowledger: {
    width: 26,
    height: 26,
  },
  heartBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sheetFill,
    borderWidth: 1,
    borderColor: colors.accentBorderPill,
  },
  heartBadgeMuted: {
    borderColor: colors.glassBorderChip,
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
    borderColor: colors.glassBorderHairline,
    backgroundColor: colors.glassFillHover,
  },
  actionActive: {
    borderColor: colors.accentBorderMid,
    backgroundColor: colors.accentFillSelected,
  },
  orange: {
    marginLeft: "auto",
    borderColor: colors.accentBorderSelected,
    backgroundColor: colors.accentFillSelected,
  },
  generatedBlock: { gap: 8 },
  generatedText: {
    minHeight: 132,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accentBorderFaint,
    backgroundColor: colors.accentFillFaint,
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
  swipeNavigationTop: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  swipeNavigationBottom: {
    alignItems: "center",
    marginTop: 16,
  },
  nav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.overlayFaint,
  },
  counter: {
    color: colors.mutedFaint,
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
    backgroundColor: colors.glassBorderSelected,
  },
  error: { color: colors.error, fontFamily: fonts.body, fontSize: 11 },
  disabled: { opacity: 0.3 },
  });
}
