import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listPrayerCards } from "../../lib/api";
import { fonts, radii, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import type { HomePrayerCard } from "../../types/home";
import { AuthenticatedImage } from "../ui/AuthenticatedImage";
import { GridOverlay } from "../ui/GridOverlay";
import { BackIcon } from "../../features/groups/components/Icons";
import { PrayerDetailModal } from "./PrayerDetailModal";

const TILE_HEIGHTS = [168, 228, 186, 252, 154, 210];

function ArchiveTile({
  card,
  index,
  onPress,
}: {
  card: HomePrayerCard;
  index: number;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createTileStyles);
  return (
    <Pressable
      accessibilityLabel={`Open ${card.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <AuthenticatedImage
        contentFit="cover"
        path={card.image}
        recyclingKey={card.image}
        style={[
          styles.image,
          { height: TILE_HEIGHTS[index % TILE_HEIGHTS.length] },
        ]}
      />
      <View style={styles.copy}>
        <Text numberOfLines={2} style={styles.title}>
          {card.title}
        </Text>
        {card.date || card.verse ? (
          <Text numberOfLines={1} style={styles.meta}>
            {[card.verse, card.date].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ArchivedPrayersScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const loadingMoreRef = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  const [cards, setCards] = useState<HomePrayerCard[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<HomePrayerCard | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const load = useCallback(async (before?: string, refresh = false) => {
    const paging = Boolean(before);
    if (paging) {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const sessionToken = await getTokenRef.current();
      if (!sessionToken) throw new Error("Your session expired. Please sign in again.");
      setToken(sessionToken);
      const result = await listPrayerCards(sessionToken, { before });
      setCards((current) =>
        paging ? [...current, ...result.cards] : result.cards,
      );
      setHasMore(result.hasMore);
      setNextBefore(result.nextBefore);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load previous prayer cards",
      );
    } finally {
      loadingMoreRef.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const left = cards.filter((_, index) => index % 2 === 0);
  const right = cards.filter((_, index) => index % 2 === 1);

  return (
    <View style={styles.root}>
      <GridOverlay />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={styles.iconButton}
        >
          <BackIcon color={colors.title} size={18} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Archive</Text>
          <Text style={styles.heading}>Previous prayers</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading && !cards.length ? (
        <View style={styles.status}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 20) + 24 },
          ]}
          onScroll={({ nativeEvent }) => {
            const nearEnd =
              nativeEvent.layoutMeasurement.height +
                nativeEvent.contentOffset.y >=
              nativeEvent.contentSize.height - 240;
            if (nearEnd && hasMore && nextBefore && !loadingMore) {
              void load(nextBefore);
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(undefined, true)}
              tintColor={colors.title}
            />
          }
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {cards.length ? (
            <View style={styles.masonry}>
              <View style={styles.column}>
                {left.map((card, index) => (
                  <ArchiveTile
                    key={card.prayeruuid || `left-${index}`}
                    card={card}
                    index={index * 2}
                    onPress={() => setSelectedCard(card)}
                  />
                ))}
              </View>
              <View style={styles.column}>
                {right.map((card, index) => (
                  <ArchiveTile
                    key={card.prayeruuid || `right-${index}`}
                    card={card}
                    index={index * 2 + 1}
                    onPress={() => setSelectedCard(card)}
                  />
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.empty}>
              Prayers you open will gather here.
            </Text>
          )}
          {loadingMore ? (
            <View style={styles.more}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null}
        </ScrollView>
      )}

      <PrayerDetailModal
        card={selectedCard}
        token={token}
        visible={selectedCard !== null}
        onClose={() => setSelectedCard(null)}
      />
    </View>
  );
}

function createTileStyles(colors: ColorTokens) {
  return StyleSheet.create({
    tile: {
      borderRadius: radii.card,
      overflow: "hidden",
      backgroundColor: colors.cardFill,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pressed: {
      opacity: 0.82,
      transform: [{ scale: 0.985 }],
    },
    image: {
      width: "100%",
    },
    copy: {
      paddingHorizontal: 10,
      paddingTop: 9,
      paddingBottom: 11,
      gap: 4,
    },
    title: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 13,
      lineHeight: 16,
    },
    meta: {
      color: colors.accentText,
      fontFamily: fonts.mono,
      fontSize: 8,
      letterSpacing: 0.28,
      textTransform: "uppercase",
    },
  });
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingBottom: 12,
      gap: 12,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.glassFill,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
    },
    headerSpacer: {
      width: 36,
    },
    eyebrow: {
      color: colors.accentText,
      fontFamily: fonts.monoMedium,
      fontSize: 9,
      letterSpacing: 0.7,
      textTransform: "uppercase",
    },
    heading: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 22,
      lineHeight: 26,
      marginTop: 2,
    },
    content: {
      paddingHorizontal: 16,
    },
    masonry: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    column: {
      flex: 1,
      gap: 10,
    },
    status: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    more: {
      paddingVertical: 20,
    },
    empty: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      paddingVertical: 28,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 14,
    },
  });
}
