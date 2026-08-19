import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../../../theme/tokens";
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
  onOpenMembers: () => void;
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
  onOpenMembers,
}: GroupOverviewProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const activeMembers = members
    .filter((member) => member.status === "active")
    .slice(0, 5);
  const displayContent = splitPurpose(group.purpose, group.scripture?.text);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 24, height * 0.1),
          paddingBottom: insets.bottom + 128,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.white}
        />
      }
      keyboardShouldPersistTaps="handled"
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
                  accessibilityLabel="Open group members and invite someone"
                  accessibilityRole="button"
                  onPress={onOpenMembers}
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
                <Pressable
                  accessibilityLabel="New prayer request"
                  onPress={onOpenRequest}
                  style={[styles.circle, styles.newCircle]}
                >
                  <PlusIcon color={colors.accent} size={14} />
                </Pressable>
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

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  body: { gap: 12 },
  label: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 10.4,
    letterSpacing: 0.62,
    textTransform: "uppercase",
  },
  title: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -0.8,
  },
  scripture: {
    maxWidth: "90%",
    color: "rgba(255,255,255,0.45)",
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
    color: "rgba(220,220,220,0.85)",
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
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteCircle: {
    borderStyle: "dotted",
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  newCircle: {
    borderColor: "rgba(249,115,22,0.4)",
    backgroundColor: "rgba(249,115,22,0.15)",
  },
  error: { color: colors.error, fontFamily: fonts.body, fontSize: 11 },
});
