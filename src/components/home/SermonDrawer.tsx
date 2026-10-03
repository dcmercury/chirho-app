import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";
import { useAuth } from "@clerk/expo";
import { getChurchMessage } from "../../lib/api";
import { openExternalUrl } from "../../lib/openExternalUrl";
import { API_BASE } from "../../lib/assets";
import {
  fonts,
  radii,
  type as typography,
  type ColorTokens,
} from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import {
  BackIcon,
  CloseIcon,
  PlayIcon,
} from "../../features/groups/components/Icons";
import type {
  ChurchMessage,
  ChurchMessageDetail,
  SermonScripture,
} from "../../types/home";
import {
  allowEmbedNavigation,
  embedHtml,
  formatDate,
  formatDuration,
  stillFor,
  VIDEO_ID,
  watchUrl,
} from "./messageMedia";
import { ScriptureDrawer } from "./ScriptureDrawer";

const DESCRIPTION_PREVIEW = 420;
const POLL_MS = 10_000;
/** Analysis usually takes about a minute; stop checking after five. */
const MAX_POLLS = 30;

export function SermonDrawer({
  message,
  communityuuid,
  communityName,
  onClose,
}: {
  message: ChurchMessage | null;
  communityuuid: string;
  communityName: string;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [detail, setDetail] = useState<ChurchMessageDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [scripture, setScripture] = useState<SermonScripture | null>(null);
  const videoId = message?.videoId || null;

  useEffect(() => {
    setDetail(null);
    setPlaying(false);
    setScripture(null);
    if (!videoId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let polls = 0;
    const load = async () => {
      try {
        const token = await getTokenRef.current();
        if (!token || !active) return;
        const result = await getChurchMessage(token, communityuuid, videoId);
        if (!active) return;
        setDetail(result);
        if (result.analysisStatus === "pending" && polls < MAX_POLLS) {
          polls += 1;
          timer = setTimeout(load, POLL_MS);
        }
      } catch {
        // The drawer still plays the video from the list data.
      } finally {
        if (active) setLoading(false);
      }
    };
    setLoading(true);
    void load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [communityuuid, videoId]);

  const close = () => {
    setPlaying(false);
    onClose();
  };

  const sermon = detail?.sermon || null;
  const still = message ? stillFor(message) : null;
  const canEmbed = Boolean(message && VIDEO_ID.test(message.videoId));
  const meta = message
    ? [
        sermon?.speaker || message.speaker,
        formatDate(message.publishedAt),
        formatDuration(detail?.message.durationSeconds ?? message.durationSeconds),
      ].filter(Boolean)
    : [];
  const eyebrow = sermon?.primaryScripture?.reference || message?.primaryScripture;
  const linked = sermon?.scriptures.filter((item) => item.kind !== "thematic") || [];
  const related = sermon?.scriptures.filter((item) => item.kind === "thematic") || [];
  const description = detail?.message.description.trim() || "";

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={Boolean(message)}
      onRequestClose={close}
    >
      <View style={styles.root}>
        {message ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>MESSAGE</Text>
                <Text style={styles.church} numberOfLines={1}>
                  {communityName}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close message"
                accessibilityRole="button"
                hitSlop={8}
                onPress={close}
                style={styles.circle}
              >
                <CloseIcon color={colors.mutedStrong} size={14} />
              </Pressable>
            </View>

            <View style={styles.hero}>
              {playing && canEmbed ? (
                <WebView
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  onShouldStartLoadWithRequest={allowEmbedNavigation}
                  originWhitelist={["*"]}
                  setSupportMultipleWindows={false}
                  source={{ html: embedHtml(message.videoId), baseUrl: API_BASE }}
                  style={styles.player}
                />
              ) : (
                <Pressable
                  accessibilityLabel={`Play ${message.title}`}
                  accessibilityRole="button"
                  onPress={() => {
                    if (canEmbed) setPlaying(true);
                    else void openExternalUrl(watchUrl(message.videoId));
                  }}
                  style={StyleSheet.absoluteFill}
                >
                  {still ? (
                    <Image
                      contentFit="cover"
                      source={{ uri: still }}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                  <View style={styles.scrim} />
                  <View style={styles.playWrap}>
                    <View style={styles.playButton}>
                      <PlayIcon color={colors.white} size={22} />
                    </View>
                    <Text style={styles.playCaption}>
                      Plays via YouTube — may include an ad
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>

            {eyebrow ? (
              <Text style={[styles.eyebrow, styles.scriptureEyebrow]}>
                {eyebrow.toUpperCase()}
              </Text>
            ) : null}
            <Text style={[styles.title, !eyebrow && styles.titleSpaced]}>
              {message.title}
            </Text>
            {meta.length ? <Text style={styles.meta}>{meta.join(" · ")}</Text> : null}
            <View style={styles.links}>
              {playing ? (
                <Pressable
                  accessibilityLabel="Back to message"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setPlaying(false)}
                  style={styles.backLink}
                >
                  <BackIcon color={colors.accent} size={14} />
                  <Text style={styles.linkText}>Back</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityLabel={`Open ${message.title} in YouTube`}
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => {
                  void openExternalUrl(watchUrl(message.videoId));
                }}
              >
                <Text style={styles.mutedLink}>Open in YouTube</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.state}>
                <ActivityIndicator color={colors.mutedGhost} />
              </View>
            ) : sermon ? (
              <>
                {sermon.summary ? (
                  <Text style={styles.summary}>{sermon.summary}</Text>
                ) : null}

                {linked.length ? (
                  <>
                    <Text style={styles.sectionLabel}>SCRIPTURE IN THIS MESSAGE</Text>
                    <View style={styles.chips}>
                      {linked.map((item) => (
                        <Pressable
                          key={item.passageId}
                          accessibilityLabel={`Read ${item.reference}`}
                          accessibilityRole="button"
                          onPress={() => setScripture(item)}
                          style={styles.chip}
                        >
                          <Text style={styles.chipText}>{item.reference}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : null}
                {related.length ? (
                  <>
                    <Text style={styles.sectionLabel}>RELATED PASSAGES</Text>
                    <View style={styles.chips}>
                      {related.map((item) => (
                        <Pressable
                          key={item.passageId}
                          accessibilityLabel={`Read ${item.reference}`}
                          accessibilityRole="button"
                          onPress={() => setScripture(item)}
                          style={[styles.chip, styles.chipQuiet]}
                        >
                          <Text style={[styles.chipText, styles.chipTextQuiet]}>
                            {item.reference}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : null}

                {sermon.keyTakeaways.length ? (
                  <>
                    <Text style={styles.sectionLabel}>TAKEAWAYS</Text>
                    {sermon.keyTakeaways.map((item, index) => (
                      <View key={item} style={styles.numbered}>
                        <Text style={styles.number}>
                          {String(index + 1).padStart(2, "0")}
                        </Text>
                        <Text style={styles.numberedText}>{item}</Text>
                      </View>
                    ))}
                  </>
                ) : null}

                {sermon.prayerPrompts.length ? (
                  <>
                    <Text style={styles.sectionLabel}>PRAY ABOUT THIS MESSAGE</Text>
                    {sermon.prayerPrompts.map((item) => (
                      <Text key={item} style={styles.prayer}>
                        {item}
                      </Text>
                    ))}
                  </>
                ) : null}

                {sermon.themes.length ? (
                  <Text style={styles.themes}>{sermon.themes.join(" · ")}</Text>
                ) : null}
                <Text style={styles.disclosure}>
                  Notes are generated from the video and may miss nuance. The
                  message itself is the source.
                </Text>
              </>
            ) : (
              <>
                {detail?.analysisStatus === "pending" ? (
                  <View style={styles.pendingRow}>
                    <ActivityIndicator color={colors.mutedGhost} size="small" />
                    <Text style={styles.pending}>
                      Finding the Scripture in this message. This takes about a
                      minute.
                    </Text>
                  </View>
                ) : null}
                {description ? (
                  <Text style={styles.summary}>
                    {description.length > DESCRIPTION_PREVIEW
                      ? `${description.slice(0, DESCRIPTION_PREVIEW).trimEnd()}…`
                      : description}
                  </Text>
                ) : null}
              </>
            )}
          </ScrollView>
        ) : null}
        <ScriptureDrawer scripture={scripture} onClose={() => setScripture(null)} />
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: 24, paddingBottom: 64 },
    handle: {
      alignSelf: "center",
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.glassBorderStrong,
      marginBottom: 24,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 20,
    },
    headerCopy: { flex: 1, minWidth: 0 },
    eyebrow: {
      ...typography.labelSm,
      color: colors.accent,
      marginBottom: 6,
    },
    church: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 17,
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
    hero: {
      width: "100%",
      aspectRatio: 16 / 9,
      borderRadius: radii.card,
      overflow: "hidden",
      backgroundColor: colors.black,
      borderWidth: 1,
      borderColor: colors.glassBorderSoft,
    },
    player: { flex: 1, backgroundColor: colors.black },
    scrim: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: colors.overlayThumb,
    },
    playWrap: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    playButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.overlayControl,
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: 3,
    },
    playCaption: {
      color: colors.bodyOnPhoto,
      fontFamily: fonts.body,
      fontSize: 11,
    },
    scriptureEyebrow: { marginTop: 18, marginBottom: 0 },
    title: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 20,
      lineHeight: 25,
      marginTop: 6,
    },
    titleSpaced: { marginTop: 16 },
    meta: {
      color: colors.cardMeta,
      fontFamily: fonts.body,
      fontSize: 12,
      marginTop: 4,
    },
    links: {
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
      marginTop: 12,
    },
    backLink: { flexDirection: "row", alignItems: "center", gap: 4 },
    linkText: {
      color: colors.accentText,
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
    },
    mutedLink: {
      color: colors.mutedSoft,
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
    },
    state: { paddingVertical: 32, alignItems: "center" },
    summary: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 20,
    },
    pendingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 20,
    },
    pending: {
      flex: 1,
      color: colors.mutedSoft,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    sectionLabel: {
      ...typography.labelSm,
      color: colors.muted,
      marginTop: 28,
      marginBottom: 12,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.glassBorderStrong,
      backgroundColor: colors.glassFill,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipQuiet: { backgroundColor: "transparent", borderColor: colors.glassBorderSoft },
    chipText: {
      color: colors.title,
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
    },
    chipTextQuiet: { color: colors.muted },
    numbered: { flexDirection: "row", gap: 12, marginBottom: 12 },
    number: {
      color: colors.accent,
      fontFamily: fonts.mono,
      fontSize: 12,
      lineHeight: 20,
    },
    numberedText: {
      flex: 1,
      color: colors.title,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    prayer: {
      color: colors.title,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 21,
      fontStyle: "italic",
      borderLeftWidth: 2,
      borderLeftColor: colors.accent,
      paddingLeft: 12,
      marginBottom: 12,
    },
    themes: {
      color: colors.mutedSoft,
      fontFamily: fonts.mono,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 24,
    },
    disclosure: {
      color: colors.mutedGhost,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 12,
    },
  });
}
