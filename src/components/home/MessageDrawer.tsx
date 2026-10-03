import { useCallback, useEffect, useRef, useState } from "react";
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
import { useAuth } from "@clerk/expo";
import { getChurchMessages } from "../../lib/api";
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
  MessageCategory,
  MessageSeries,
} from "../../types/home";
import { formatDate, stillFor } from "./messageMedia";
import { SermonDrawer } from "./SermonDrawer";

const LATEST = "latest";

function rowMeta(message: ChurchMessage): string | null {
  const parts = [message.primaryScripture, formatDate(message.publishedAt)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function MessageDrawer({
  visible,
  communityuuid,
  communityName,
  onClose,
}: {
  visible: boolean;
  communityuuid: string;
  communityName: string;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const requestGeneration = useRef(0);
  const [categories, setCategories] = useState<MessageCategory[]>([]);
  const [categoryId, setCategoryId] = useState(LATEST);
  const [series, setSeries] = useState<MessageSeries | null>(null);
  const [videos, setVideos] = useState<ChurchMessage[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChurchMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = categories.find((item) => item.id === categoryId);
  const playlistId =
    series?.playlistId ?? (categoryId === LATEST ? null : category?.playlistId ?? null);
  const showingSeriesList = categoryId === "series" && !series;

  const fetchPage = useCallback(
    async (playlist: string | null, pageToken: string | null) => {
      const token = await getTokenRef.current();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      return getChurchMessages(token, communityuuid, pageToken, playlist);
    },
    [communityuuid],
  );

  const openList = useCallback(
    (playlist: string | null) => {
      const generation = ++requestGeneration.current;
      setVideos([]);
      setNextPageToken(null);
      setError(null);
      setLoading(true);
      fetchPage(playlist, null)
        .then((page) => {
          if (generation !== requestGeneration.current) return;
          setVideos(page.videos);
          setNextPageToken(page.nextPageToken);
          if (page.categories.length) setCategories(page.categories);
        })
        .catch((err) => {
          if (generation !== requestGeneration.current) return;
          setError(err instanceof Error ? err.message : "Unable to load messages.");
        })
        .finally(() => {
          if (generation === requestGeneration.current) setLoading(false);
        });
    },
    [fetchPage],
  );

  useEffect(() => {
    if (!visible) {
      requestGeneration.current += 1;
      setSelected(null);
      setCategories([]);
      setCategoryId(LATEST);
      setSeries(null);
      setVideos([]);
      setNextPageToken(null);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    openList(null);
  }, [openList, visible]);

  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    const generation = requestGeneration.current;
    setLoadingMore(true);
    try {
      const page = await fetchPage(playlistId, nextPageToken);
      if (generation !== requestGeneration.current) return;
      setVideos((current) => [...current, ...page.videos]);
      setNextPageToken(page.nextPageToken);
    } catch (err) {
      if (generation === requestGeneration.current) {
        setError(err instanceof Error ? err.message : "Unable to load messages.");
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const chooseCategory = (next: MessageCategory) => {
    if (next.id === categoryId && !series) return;
    setCategoryId(next.id);
    setSeries(null);
    if (next.playlistId === null) {
      requestGeneration.current += 1;
      setVideos([]);
      setNextPageToken(null);
      setError(null);
      setLoading(false);
      return;
    }
    openList(next.id === LATEST ? null : next.playlistId);
  };

  const chooseSeries = (next: MessageSeries) => {
    setSeries(next);
    openList(next.playlistId);
  };

  const showFeatured = categoryId === LATEST;
  const [first, ...others] = videos;
  const featured = showFeatured ? first : undefined;
  const listed = showFeatured ? others : videos;
  const featuredStill = featured ? stillFor(featured) : null;
  const featuredMeta = featured ? rowMeta(featured) : null;

  const renderRow = (video: ChurchMessage) => {
    const meta = rowMeta(video);
    return (
      <Pressable
        key={video.videoId}
        accessibilityLabel={`Open ${video.title}`}
        accessibilityRole="button"
        onPress={() => setSelected(video)}
        style={styles.row}
      >
        <View style={styles.rowThumb}>
          {video.thumbnail ? (
            <Image
              contentFit="cover"
              source={{ uri: video.thumbnail }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </View>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {video.title}
          </Text>
          {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>MESSAGES</Text>
              <Text style={styles.church} numberOfLines={1}>
                {communityName}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close messages"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.circle}
            >
              <CloseIcon color={colors.mutedStrong} size={14} />
            </Pressable>
          </View>

          {categories.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filters}
              contentContainerStyle={styles.filtersContent}
            >
              {categories.map((item) => {
                const active = item.id === categoryId;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityLabel={`Show ${item.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => chooseCategory(item)}
                    style={[styles.filter, active && styles.filterActive]}
                  >
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {showingSeriesList ? (
            (category?.series || []).map((item) => (
              <Pressable
                key={item.playlistId}
                accessibilityLabel={`Open ${item.title} series`}
                accessibilityRole="button"
                onPress={() => chooseSeries(item)}
                style={styles.row}
              >
                <View style={styles.rowThumb}>
                  {item.thumbnail ? (
                    <Image
                      contentFit="cover"
                      source={{ uri: item.thumbnail }}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {item.itemCount === 1 ? "1 message" : `${item.itemCount} messages`}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <>
              {series ? (
                <View style={styles.seriesHeader}>
                  <Pressable
                    accessibilityLabel="Back to all series"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setSeries(null)}
                    style={styles.backLink}
                  >
                    <BackIcon color={colors.accent} size={14} />
                    <Text style={styles.linkText}>All series</Text>
                  </Pressable>
                  <Text style={styles.seriesTitle}>{series.title}</Text>
                </View>
              ) : null}

              {loading ? (
                <View style={styles.state}>
                  <ActivityIndicator color={colors.mutedGhost} />
                </View>
              ) : !videos.length ? (
                <Text style={styles.empty}>
                  {error ||
                    (categoryId === LATEST
                      ? "No messages from this church yet."
                      : "Nothing here yet.")}
                </Text>
              ) : (
                <>
                  {featured ? (
                    <Pressable
                      accessibilityLabel={`Open ${featured.title}`}
                      accessibilityRole="button"
                      onPress={() => setSelected(featured)}
                    >
                      <View style={styles.hero}>
                        {featuredStill ? (
                          <Image
                            contentFit="cover"
                            source={{ uri: featuredStill }}
                            style={StyleSheet.absoluteFill}
                          />
                        ) : null}
                        <View style={styles.scrim} />
                        <View style={styles.playWrap}>
                          <View style={styles.playButton}>
                            <PlayIcon color={colors.white} size={22} />
                          </View>
                        </View>
                      </View>
                      <Text style={[styles.eyebrow, styles.latestLabel]}>LATEST</Text>
                      <Text style={styles.title}>{featured.title}</Text>
                      {featuredMeta ? (
                        <Text style={styles.meta}>{featuredMeta}</Text>
                      ) : null}
                    </Pressable>
                  ) : null}

                  {featured && listed.length ? (
                    <Text style={[styles.eyebrow, styles.sectionLabel]}>
                      MORE MESSAGES
                    </Text>
                  ) : null}
                  {listed.map(renderRow)}
                  {nextPageToken ? (
                    <Pressable
                      accessibilityLabel="Load more messages"
                      accessibilityRole="button"
                      accessibilityState={{ busy: loadingMore, disabled: loadingMore }}
                      disabled={loadingMore}
                      onPress={() => {
                        void loadMore();
                      }}
                      style={styles.more}
                    >
                      {loadingMore ? (
                        <ActivityIndicator color={colors.mutedGhost} size="small" />
                      ) : (
                        <Text style={styles.mutedLink}>Load more</Text>
                      )}
                    </Pressable>
                  ) : null}
                  {error ? <Text style={styles.error}>{error}</Text> : null}
                </>
              )}
            </>
          )}
        </ScrollView>
        <SermonDrawer
          message={selected}
          communityuuid={communityuuid}
          communityName={communityName}
          onClose={() => setSelected(null)}
        />
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
    filters: { marginHorizontal: -24, marginBottom: 20 },
    filtersContent: { paddingHorizontal: 24, gap: 8 },
    filter: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    filterActive: {
      backgroundColor: colors.accentFillPill,
      borderColor: colors.accentBorderPill,
    },
    filterText: {
      color: colors.mutedSoft,
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
    },
    filterTextActive: { color: colors.accentText },
    seriesHeader: { marginBottom: 12, gap: 10 },
    backLink: { flexDirection: "row", alignItems: "center", gap: 4 },
    linkText: {
      color: colors.accentText,
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
    },
    seriesTitle: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 20,
      lineHeight: 25,
    },
    state: { paddingVertical: 48, alignItems: "center" },
    empty: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      paddingVertical: 24,
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
    latestLabel: { marginTop: 16, marginBottom: 0 },
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
    title: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 20,
      lineHeight: 25,
      marginTop: 6,
    },
    meta: {
      color: colors.cardMeta,
      fontFamily: fonts.body,
      fontSize: 12,
      marginTop: 4,
    },
    mutedLink: {
      color: colors.mutedSoft,
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
    },
    sectionLabel: { color: colors.muted, marginTop: 32, marginBottom: 12 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
    },
    rowThumb: {
      width: 112,
      aspectRatio: 16 / 9,
      borderRadius: radii.thumb,
      overflow: "hidden",
      backgroundColor: colors.glassFill,
    },
    rowCopy: { flex: 1, minWidth: 0 },
    rowTitle: {
      color: colors.title,
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      lineHeight: 18,
    },
    rowMeta: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      marginTop: 3,
    },
    more: { alignItems: "center", paddingVertical: 16 },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 12,
      marginTop: 12,
    },
  });
}
