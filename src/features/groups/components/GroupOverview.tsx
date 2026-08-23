import { useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { SwipeChevron } from "../../../components/ui/SwipeChevron";
import { fonts, type ColorTokens } from "../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../theme/ThemeProvider";
import type {
  GroupMember,
  GroupMessage,
  PrayerGroup,
  PrayerIntensity,
} from "../types";
import { PlusIcon } from "./Icons";
import { GroupAvatar } from "./GroupAvatar";
import { PrayerRequestForm } from "./PrayerRequestForm";
import { Stagger } from "./Stagger";

const COLLAPSED_ABOUT_LINES = 3;
const COLLAPSED_PRAYER_LINES = 2;
const RECENT_PRAYER_LIMIT = 5;

interface GroupOverviewProps {
  group: PrayerGroup;
  members: GroupMember[];
  messages: GroupMessage[];
  prayerRequestCount: number;
  refreshing: boolean;
  requestOpen: boolean;
  requestText: string;
  generatingRequest: boolean;
  sendingRequest: boolean;
  actionError: string | null;
  onRefresh: () => void;
  onOpenPrayers: () => void;
  onOpenPrayer: (messageId: string) => void;
  onOpenRequest: () => void;
  onCloseRequest: () => void;
  onRequestTextChange: (value: string) => void;
  onGenerateRequest: (intensities: PrayerIntensity[]) => Promise<void>;
  onSubmitRequest: (intensities: PrayerIntensity[]) => Promise<void>;
  onOpenInvite: () => void;
}

export function GroupOverview({
  group,
  members,
  messages,
  prayerRequestCount,
  refreshing,
  requestOpen,
  requestText,
  generatingRequest,
  sendingRequest,
  actionError,
  onRefresh,
  onOpenPrayers,
  onOpenPrayer,
  onOpenRequest,
  onCloseRequest,
  onRequestTextChange,
  onGenerateRequest,
  onSubmitRequest,
  onOpenInvite,
}: GroupOverviewProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const activeMembers = members
    .filter((member) => member.status === "active")
    .slice(0, 5);
  const displayContent = splitPurpose(group.purpose, group.scripture?.text);
  const recentPrayers = [...messages]
    .reverse()
    .slice(0, RECENT_PRAYER_LIMIT);
  const canOpenPrayers = prayerRequestCount > 0 && !requestOpen;
  const scrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const touchStartRef = useRef<{
    pageY: number;
    canOpenPrayers: boolean;
  } | null>(null);

  const handleTouchStart = (pageY: number) => {
    const offset = scrollOffsetRef.current;
    const viewportHeight = viewportHeightRef.current;
    const contentHeight = contentHeightRef.current;
    const contentFits = contentHeight <= viewportHeight + 4;
    touchStartRef.current = {
      pageY,
      canOpenPrayers: canOpenPrayers && (contentFits || offset <= 4),
    };
  };

  const handleTouchEnd = (pageY: number) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    if (pageY - start.pageY >= 56 && start.canOpenPrayers) {
      onOpenPrayers();
    }
  };

  return (
    <View style={styles.root}>
    <ScrollView
      alwaysBounceVertical={!canOpenPrayers}
      bounces={!canOpenPrayers}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 56,
          paddingBottom: insets.bottom + 128,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={(_, contentHeight) => {
        contentHeightRef.current = contentHeight;
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
      refreshControl={
        canOpenPrayers ? undefined : (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.title}
          />
        )
      }
      scrollEventThrottle={16}
    >
      <View style={styles.body}>
        <Stagger delay={200}>
          <Text style={styles.label}>{group.tradition || "PRAYER GROUP"}</Text>
        </Stagger>
        <Stagger delay={300}>
          <Text style={styles.title}>{group.name}</Text>
        </Stagger>
        {requestOpen ? (
          <PrayerRequestForm
            value={requestText}
            onChange={onRequestTextChange}
            onGenerate={onGenerateRequest}
            onSubmit={onSubmitRequest}
            onCancel={onCloseRequest}
            generating={generatingRequest}
            sending={sendingRequest}
          />
        ) : null}
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
        {!requestOpen ? (
          <Stagger delay={400}>
            <View style={styles.prayersSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>PRAYER REQUESTS</Text>
                {prayerRequestCount > recentPrayers.length ? (
                  <Pressable onPress={onOpenPrayers} hitSlop={10}>
                    <Text style={styles.prayerLink}>SEE ALL</Text>
                  </Pressable>
                ) : null}
              </View>
              {recentPrayers.length ? (
                recentPrayers.map((message) => {
                  const author = getMember(members, message.userId);
                  const authorName = getMemberName(author, message.userId);
                  return (
                    <Pressable
                      key={message.messageId}
                      accessibilityLabel={`Open prayer request from ${authorName}`}
                      accessibilityRole="button"
                      onPress={() => onOpenPrayer(message.messageId)}
                      style={styles.prayerCard}
                    >
                      <View style={styles.prayerAuthor}>
                        <GroupAvatar
                          uri={author?.profile?.avatar}
                          name={authorName}
                          size={28}
                          borderColor={colors.glassBorderRow}
                        />
                        <Text style={styles.prayerName}>{authorName}</Text>
                        <Text style={styles.prayerTime}>
                          {formatRelativeTime(message.timestamp)}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={COLLAPSED_PRAYER_LINES}
                        style={styles.prayerPreview}
                      >
                        {message.content}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <Text style={styles.emptyPrayers}>
                  No prayer requests yet. Be the first to share.
                </Text>
              )}
            </View>
          </Stagger>
        ) : null}
        {!requestOpen ? (
          <Stagger delay={500}>
            <CollapsibleGroupAbout
              citation={group.scripture?.citation}
              intro={displayContent.intro}
              main={displayContent.main}
            />
          </Stagger>
        ) : null}
        <Stagger delay={600}>
          <View style={styles.divider} />
        </Stagger>
        <Stagger delay={650}>
          <View style={styles.membersHeader}>
            <Text style={styles.label}>MEMBERS</Text>
            <Pressable onPress={onOpenPrayers} hitSlop={10}>
              <Text style={styles.prayerLink}>PRAYER REQUESTS</Text>
            </Pressable>
          </View>
        </Stagger>
        <Stagger delay={700}>
          <View style={styles.memberActions}>
            <View style={styles.avatars}>
              {activeMembers.map((member, index) => {
                const name =
                  member.profile?.firstName || member.firstName || "Member";
                return (
                  <GroupAvatar
                    key={member.memberId}
                    uri={member.profile?.avatar}
                    name={name}
                    size={36}
                    style={index ? styles.overlap : undefined}
                  />
                );
              })}
              {group.canInvite ? (
                <Pressable
                  accessibilityLabel="Invite someone to this group"
                  accessibilityRole="button"
                  onPress={onOpenInvite}
                  style={[
                    styles.circle,
                    styles.inviteCircle,
                    activeMembers.length ? styles.overlap : undefined,
                  ]}
                >
                  <PlusIcon color={colors.mutedSoft} size={14} />
                </Pressable>
              ) : null}
            </View>
            {!requestOpen ? (
              <View style={styles.rightActions}>
                {group.canCreatePrayerRequests ? (
                  <Pressable
                    accessibilityLabel="New prayer request"
                    onPress={onOpenRequest}
                    style={[styles.circle, styles.newCircle]}
                  >
                    <PlusIcon color={colors.accent} size={14} />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityLabel={`View ${prayerRequestCount} prayer ${
                    prayerRequestCount === 1 ? "request" : "requests"
                  }`}
                  onPress={onOpenPrayers}
                  style={styles.circle}
                >
                  <Text style={styles.requestCount}>{prayerRequestCount}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </Stagger>
      </View>
    </ScrollView>
    {canOpenPrayers ? (
      <View
        style={[
          styles.swipeNavigation,
          { bottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <SwipeChevron
          accessibilityLabel="View prayer requests, swipe down"
          direction="down"
          onPress={onOpenPrayers}
        />
      </View>
    ) : null}
    </View>
  );
}

function CollapsibleGroupAbout({
  intro,
  citation,
  main,
}: {
  intro: string;
  citation?: string | null;
  main: string;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const preview = [intro, citation ? `— ${citation}` : "", main]
    .filter(Boolean)
    .join(" ");

  if (!intro && !main) {
    return (
      <Text style={styles.scripture}>
        This group&apos;s purpose is being developed.
      </Text>
    );
  }

  return (
    <View style={styles.about}>
      {expanded ? (
        <View style={styles.aboutExpanded}>
          {intro ? <Text style={styles.scripture}>{intro}</Text> : null}
          {citation ? (
            <Text style={styles.label}>— {citation}</Text>
          ) : null}
          {main ? <Text style={styles.purpose}>{main}</Text> : null}
        </View>
      ) : (
        <Text
          numberOfLines={COLLAPSED_ABOUT_LINES}
          onTextLayout={(event) => {
            if (event.nativeEvent.lines.length >= COLLAPSED_ABOUT_LINES) {
              setCanExpand(true);
            }
          }}
          style={styles.scripture}
        >
          {preview}
        </Text>
      )}
      {canExpand ? (
        <Pressable
          accessibilityLabel={
            expanded ? "Show less group purpose" : "Read more group purpose"
          }
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

function splitPurpose(purpose: string, scripture?: string | null) {
  const trimmed = purpose.trim();
  if (scripture) return { intro: scripture.trim(), main: trimmed };
  if (!trimmed) return { intro: "", main: "" };
  const sentences = trimmed.match(/[^.!?]*[.!?]+/g);
  if (sentences && sentences.length >= 2) {
    const intro = `${sentences[0]}${sentences[1]}`.trim();
    return { intro, main: trimmed.slice(intro.length).trim() };
  }
  return { intro: trimmed, main: "" };
}

function getMember(members: GroupMember[], userId: string) {
  return members.find((member) => member.clerkuuid === userId) || null;
}

function getMemberName(member: GroupMember | null, fallback?: string) {
  const name = [
    member?.profile?.firstName || member?.firstName,
    member?.profile?.lastName,
  ]
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  body: { gap: 12 },
  label: {
    color: colors.accentText,
    fontFamily: fonts.mono,
    fontSize: 10.4,
    letterSpacing: 0.62,
    textTransform: "uppercase",
  },
  title: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -0.8,
    paddingRight: 72,
  },
  prayersSection: { gap: 10, marginTop: 4 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prayerCard: {
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.glassBorderSoft,
    backgroundColor: colors.cardFill,
  },
  prayerAuthor: { flexDirection: "row", alignItems: "center", gap: 8 },
  prayerName: {
    flexShrink: 1,
    color: colors.mutedSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  prayerTime: {
    marginLeft: "auto",
    color: colors.mutedDeep,
    fontFamily: fonts.body,
    fontSize: 9.6,
    fontStyle: "italic",
  },
  prayerPreview: {
    color: colors.bodyOnPhoto,
    fontFamily: fonts.body,
    fontSize: 13.6,
    lineHeight: 20.5,
  },
  emptyPrayers: {
    color: colors.mutedMid,
    fontFamily: fonts.body,
    fontSize: 12.8,
    lineHeight: 20,
    fontStyle: "italic",
  },
  about: { gap: 4 },
  aboutExpanded: { gap: 12 },
  scripture: {
    maxWidth: "90%",
    color: colors.mutedMid,
    fontFamily: fonts.body,
    fontSize: 12.8,
    lineHeight: 20.5,
    fontStyle: "italic",
  },
  purpose: {
    maxWidth: "95%",
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    color: colors.bodyOnPhoto,
    fontFamily: fonts.body,
    fontSize: 15.2,
    lineHeight: 27.4,
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
  divider: {
    width: 32,
    height: 1,
    marginVertical: 8,
    backgroundColor: colors.footerRule,
  },
  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prayerLink: {
    color: colors.subtitle,
    fontFamily: fonts.mono,
    fontSize: 10.4,
    letterSpacing: 0.62,
  },
  memberActions: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatars: { flexDirection: "row", alignItems: "center", flex: 1 },
  overlap: { marginLeft: -8 },
  rightActions: { flexDirection: "row", gap: 5 },
  requestCount: {
    color: colors.mutedStrong,
    fontFamily: fonts.monoMedium,
    fontSize: 12,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.glassBorderStrong,
    backgroundColor: colors.glassFill,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteCircle: {
    borderStyle: "dotted",
    borderColor: colors.glassBorderLouder,
    backgroundColor: colors.glassFillHover,
  },
  newCircle: {
    borderColor: colors.accentBorderSelected,
    backgroundColor: colors.accentFillSelected,
  },
  error: { color: colors.error, fontFamily: fonts.body, fontSize: 11 },
  swipeNavigation: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  });
}
