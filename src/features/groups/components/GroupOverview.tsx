import { useRef } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SwipeChevron } from "../../../components/ui/SwipeChevron";
import { fonts, type ColorTokens } from "../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../theme/ThemeProvider";
import type {
  GroupMember,
  PrayerGroup,
  PrayerIntensity,
} from "../types";
import { PlusIcon } from "./Icons";
import { GroupAvatar } from "./GroupAvatar";
import { PrayerRequestForm } from "./PrayerRequestForm";
import { Stagger } from "./Stagger";

interface GroupOverviewProps {
  group: PrayerGroup;
  members: GroupMember[];
  prayerRequestCount: number;
  refreshing: boolean;
  requestOpen: boolean;
  requestText: string;
  generatingRequest: boolean;
  sendingRequest: boolean;
  actionError: string | null;
  onRefresh: () => void;
  onOpenPrayers: () => void;
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
  prayerRequestCount,
  refreshing,
  requestOpen,
  requestText,
  generatingRequest,
  sendingRequest,
  actionError,
  onRefresh,
  onOpenPrayers,
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
  const { height } = useWindowDimensions();
  const activeMembers = members
    .filter((member) => member.status === "active")
    .slice(0, 5);
  const displayContent = splitPurpose(group.purpose, group.scripture?.text);
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
          paddingTop: Math.max(insets.top + 24, height * 0.1),
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
        {!requestOpen && displayContent.intro ? (
          <Stagger delay={400}>
            <Text style={styles.scripture}>{displayContent.intro}</Text>
          </Stagger>
        ) : null}
        {!requestOpen && group.scripture?.citation ? (
          <Stagger delay={450}>
            <Text style={styles.label}>— {group.scripture.citation}</Text>
          </Stagger>
        ) : null}
        {!requestOpen && displayContent.main ? (
          <Stagger delay={550}>
            <Text style={styles.purpose}>{displayContent.main}</Text>
          </Stagger>
        ) : null}
        {!requestOpen && !displayContent.intro && !displayContent.main ? (
          <Stagger delay={400}>
            <Text style={styles.scripture}>
              This group&apos;s purpose is being developed.
            </Text>
          </Stagger>
        ) : null}
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

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  root: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
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
  },
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
