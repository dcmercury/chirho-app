import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@clerk/expo";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
} from "react-native-reanimated";
import { BackIcon } from "../../features/groups/components/Icons";
import {
  generatePrayerCardAudio,
  getPrayerDeck,
  retryPrayerDeckItem,
} from "../../lib/api";
import { resolveImage } from "../../lib/assets";
import { colors, fonts } from "../../theme/tokens";
import type {
  HomePrayerCard,
  PrayerDeckCard,
  PrayerDeckDetail,
} from "../../types/home";
import { GridOverlay } from "../ui/GridOverlay";
import {
  PrayerDeckPager,
  type PrayerDeckPagerHandle,
} from "./PrayerDeckPager";
import { PrayerDetailModal } from "./PrayerDetailModal";

export function PrayerDeckScreen({
  deckuuid,
  onClose,
}: {
  deckuuid: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const sequenceActiveRef = useRef(false);
  const pagerRef = useRef<PrayerDeckPagerHandle>(null);
  const [token, setToken] = useState<string | null>(null);
  const [deck, setDeck] = useState<PrayerDeckDetail | null>(null);
  const [cards, setCards] = useState<PrayerDeckCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<HomePrayerCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prayAllActive, setPrayAllActive] = useState(false);
  const [detailNavigationDirection, setDetailNavigationDirection] = useState<
    -1 | 1
  >(1);
  const [preparing, setPreparing] = useState(false);
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  const [retryingItems, setRetryingItems] = useState<Record<string, boolean>>(
    {},
  );
  const [itemErrors, setItemErrors] = useState<Record<string, string | undefined>>(
    {},
  );

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const load = useCallback(async (showLoading = true) => {
    if (!deckuuid) return;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const sessionToken = await getTokenRef.current();
      if (!sessionToken) throw new Error("Your session expired. Please sign in again.");
      setToken(sessionToken);
      const result = await getPrayerDeck(deckuuid, sessionToken);
      setDeck(result.deck);
      setCards(result.cards);
      setCurrentIndex((current) =>
        Math.min(current, Math.max(0, result.cards.length - 1)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load this prayer deck");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [deckuuid]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateCard = useCallback(
    (deckIndex: number, updates: Partial<PrayerDeckCard>) => {
      setCards((current) =>
        current.map((card) =>
          card.deckIndex === deckIndex ? { ...card, ...updates } : card,
        ),
      );
      setSelectedCard((current) =>
        current?.deckIndex === deckIndex ? { ...current, ...updates } : current,
      );
    },
    [],
  );

  const prepareIndividualAudio = (card: PrayerDeckCard) => {
    setSelectedCard(card);
    if (card.narrationUrl || !card.prayeruuid || !token) return;
    updateCard(card.deckIndex, { audioStatus: "pending" });
    void generatePrayerCardAudio(card.prayeruuid, token)
      .then((audio) => {
        updateCard(card.deckIndex, {
          narrationUrl: audio.narrationUrl,
          backgroundMusicUrl: audio.backgroundMusicUrl || card.backgroundMusicUrl,
          backgroundMusicVolume: audio.backgroundMusicVolume,
          audioAvailable: audio.audioStatus === "ready",
          audioStatus: audio.audioStatus,
        });
      })
      .catch(() => {
        updateCard(card.deckIndex, {
          audioAvailable: false,
          audioStatus: "failed",
        });
      });
  };

  const showAdjacentCard = (direction: -1 | 1) => {
    if (prayAllActive) return;
    const nextIndex = currentIndex + direction;
    const nextCard = cards[nextIndex];
    if (!nextCard) return;
    setDetailNavigationDirection(direction);
    setCurrentIndex(nextIndex);
    prepareIndividualAudio(nextCard);
  };

  const prepareSequentialCard = useCallback(
    async (index: number) => {
      if (!sequenceActiveRef.current) return;
      const card = cards[index];
      if (!card) {
        sequenceActiveRef.current = false;
        setPrayAllActive(false);
        setPreparing(false);
        return;
      }
      setCurrentIndex(index);
      setSelectedCard(null);
      setSequenceError(null);
      setPreparing(true);

      if (card.narrationUrl && card.audioAvailable !== false) {
        setPreparing(false);
        setSelectedCard(card);
        return;
      }
      if (!card.prayeruuid || !token) {
        setPreparing(false);
        setSequenceError("This prayer has no audio source yet.");
        return;
      }

      try {
        const audio = await generatePrayerCardAudio(card.prayeruuid, token);
        const updates: Partial<PrayerDeckCard> = {
          narrationUrl: audio.narrationUrl,
          backgroundMusicUrl: audio.backgroundMusicUrl || card.backgroundMusicUrl,
          backgroundMusicVolume: audio.backgroundMusicVolume,
          audioAvailable: audio.audioStatus === "ready",
          audioStatus: audio.audioStatus,
        };
        updateCard(card.deckIndex, updates);
        if (!sequenceActiveRef.current) return;
        if (audio.audioStatus !== "ready" || !audio.narrationUrl) {
          throw new Error("Narration could not be prepared.");
        }
        setSelectedCard({ ...card, ...updates });
      } catch (err) {
        if (sequenceActiveRef.current) {
          setSequenceError(
            err instanceof Error ? err.message : "Narration could not be prepared.",
          );
        }
      } finally {
        setPreparing(false);
      }
    },
    [cards, token, updateCard],
  );

  const advanceSequence = useCallback(() => {
    if (!sequenceActiveRef.current) return;
    setSelectedCard(null);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= cards.length) {
      sequenceActiveRef.current = false;
      setPrayAllActive(false);
      setSequenceError(null);
      return;
    }
    void prepareSequentialCard(nextIndex);
  }, [cards.length, currentIndex, prepareSequentialCard]);

  const startPrayAll = () => {
    if (!cards.length) return;
    sequenceActiveRef.current = true;
    setPrayAllActive(true);
    void prepareSequentialCard(0);
  };

  const stopPrayAll = () => {
    sequenceActiveRef.current = false;
    setPrayAllActive(false);
    setPreparing(false);
    setSequenceError(null);
    setSelectedCard(null);
  };

  const retryFailedItem = async (subjectId: string) => {
    if (!token || retryingItems[subjectId]) return;
    setRetryingItems((current) => ({ ...current, [subjectId]: true }));
    setItemErrors((current) => ({ ...current, [subjectId]: undefined }));
    try {
      await retryPrayerDeckItem(deckuuid, subjectId, token);
      await load(false);
    } catch (err) {
      setItemErrors((current) => ({
        ...current,
        [subjectId]:
          err instanceof Error ? err.message : "Unable to retry this prayer.",
      }));
    } finally {
      setRetryingItems((current) => ({ ...current, [subjectId]: false }));
    }
  };

  const currentCard = cards[currentIndex] || null;
  const failedItems =
    deck?.status === "partial" || deck?.status === "failed"
      ? deck.items.filter((item) => item.status === "failed")
      : [];
  const completed = currentIndex + (prayAllActive ? 0 : 1);
  const progress = cards.length ? Math.min(1, completed / cards.length) : 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.white} size="large" />
        <Text style={styles.loadingText}>Gathering your daily prayers…</Text>
      </View>
    );
  }

  if (error || !deck) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text accessibilityRole="alert" style={styles.errorTitle}>
          Unable to open this deck
        </Text>
        <Text style={styles.errorText}>{error || "The deck was unavailable."}</Text>
        <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.primary}>
          <Text style={styles.primaryText}>Try again</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondary}>
          <Text style={styles.secondaryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {currentCard ? (
        <Animated.View
          key={currentCard.prayeruuid || currentCard.deckIndex}
          entering={FadeIn.duration(520)
            .easing(Easing.bezier(0.22, 1, 0.36, 1))
            .reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(280)
            .easing(Easing.bezier(0.25, 1, 0.5, 1))
            .reduceMotion(ReduceMotion.System)}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <Image
            source={resolveImage(currentCard.image)}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </Animated.View>
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      <GridOverlay />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={styles.iconButton}
        >
          <BackIcon color={colors.white} size={18} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{deck.timeOfDay} prayer deck</Text>
          <Text style={styles.date}>{deck.localDate}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            {cards.length ? `${currentIndex + 1} of ${cards.length}` : "No cards"}
          </Text>
          <Text style={styles.progressLabel}>
            {deck.readyCards} ready
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {deck.status === "partial" ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              This deck is partial. You can pray the cards that are ready now.
            </Text>
          </View>
        ) : deck.status === "pending" ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>This deck is still being prepared.</Text>
          </View>
        ) : deck.status === "failed" ? (
          <View style={styles.errorNotice}>
            <Text style={styles.errorText}>
              Some or all of this deck could not be prepared.
            </Text>
          </View>
        ) : null}

        {failedItems.length ? (
          <View style={styles.failedSection}>
            <Text style={styles.failedTitle}>Prayers needing attention</Text>
            {failedItems.map((item) => {
              const retrying = Boolean(retryingItems[item.subjectId]);
              return (
                <View key={`${item.subjectType}:${item.subjectId}`}>
                  <View style={styles.failedItem}>
                    <View style={styles.failedCopy}>
                      <Text style={styles.failedLabel}>{item.label}</Text>
                      <Text style={styles.failedMeta}>
                        {item.error || "This prayer could not be prepared."}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel={`Retry ${item.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ busy: retrying, disabled: retrying }}
                      disabled={retrying}
                      onPress={() => void retryFailedItem(item.subjectId)}
                      style={[styles.retryButton, retrying && styles.disabled]}
                    >
                      {retrying ? (
                        <ActivityIndicator color={colors.accent} size="small" />
                      ) : (
                        <Text style={styles.retryButtonText}>Retry</Text>
                      )}
                    </Pressable>
                  </View>
                  {itemErrors[item.subjectId] ? (
                    <Text accessibilityRole="alert" style={styles.itemError}>
                      {itemErrors[item.subjectId]}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {currentCard ? (
          <View style={styles.cardStage}>
            <PrayerDeckPager
              ref={pagerRef}
              cards={cards}
              currentIndex={currentIndex}
              disabled={prayAllActive}
              onIndexChange={setCurrentIndex}
              onOpenCard={(card) => {
                setDetailNavigationDirection(1);
                prepareIndividualAudio(card);
              }}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No prayers are ready yet</Text>
            <Text style={styles.emptyText}>
              Try again shortly while your daily deck is prepared.
            </Text>
          </View>
        )}

        <View style={styles.paging}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: currentIndex === 0 }}
            disabled={currentIndex === 0 || prayAllActive}
            onPress={() => pagerRef.current?.previous()}
            style={[
              styles.pageButton,
              (currentIndex === 0 || prayAllActive) && styles.disabled,
            ]}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: currentIndex >= cards.length - 1 }}
            disabled={currentIndex >= cards.length - 1 || prayAllActive}
            onPress={() => pagerRef.current?.next()}
            style={[
              styles.pageButton,
              (currentIndex >= cards.length - 1 || prayAllActive) &&
                styles.disabled,
            ]}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </Pressable>
        </View>

        {preparing || sequenceError ? (
          <View style={sequenceError ? styles.errorNotice : styles.notice}>
            {preparing ? (
              <View style={styles.preparingRow}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.noticeText}>Preparing narration…</Text>
              </View>
            ) : (
              <>
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {sequenceError}
                </Text>
                <View style={styles.sequenceActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void prepareSequentialCard(currentIndex)}
                    style={styles.smallAction}
                  >
                    <Text style={styles.smallActionText}>Retry</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={advanceSequence}
                    style={styles.smallAction}
                  >
                    <Text style={styles.smallActionText}>Skip</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={stopPrayAll}
                    style={styles.smallAction}
                  >
                    <Text style={styles.smallActionText}>Stop</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !cards.length || preparing }}
          disabled={!cards.length || preparing}
          onPress={prayAllActive ? stopPrayAll : startPrayAll}
          style={[styles.primary, (!cards.length || preparing) && styles.disabled]}
        >
          <Text style={styles.primaryText}>
            {prayAllActive ? "Stop praying" : "Pray All"}
          </Text>
        </Pressable>
      </ScrollView>

      <PrayerDetailModal
        key={
          selectedCard?.prayeruuid ||
          selectedCard?.deckIndex ||
          "prayer-deck-detail"
        }
        card={selectedCard}
        token={token}
        visible={selectedCard !== null}
        autoPlay={prayAllActive}
        deckPosition={
          selectedCard && cards.length > 1
            ? `${currentIndex + 1} of ${cards.length}`
            : undefined
        }
        navigationContext="daily-prayer-deck"
        navigationDirection={detailNavigationDirection}
        onPrevious={
          !prayAllActive && currentIndex > 0
            ? () => showAdjacentCard(-1)
            : undefined
        }
        onNext={
          !prayAllActive && currentIndex < cards.length - 1
            ? () => showAdjacentCard(1)
            : undefined
        }
        onPlaybackComplete={prayAllActive ? advanceSequence : undefined}
        onPlaybackError={
          prayAllActive
            ? () => {
                setSelectedCard(null);
                setSequenceError("Narration could not be played.");
              }
            : undefined
        }
        onClose={prayAllActive ? stopPrayAll : () => setSelectedCard(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
    padding: 24,
  },
  overlay: { backgroundColor: "rgba(0,0,0,0.82)" },
  loadingText: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  headerCopy: { flex: 1, alignItems: "center" },
  headerSpacer: { width: 44 },
  eyebrow: {
    color: colors.accent,
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  date: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 10,
    marginTop: 2,
  },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18 },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    color: colors.mutedSoft,
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: "uppercase",
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.glassFillStrong,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.accent },
  notice: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    padding: 12,
    marginTop: 16,
  },
  errorNotice: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorBg,
    padding: 12,
    marginTop: 16,
  },
  failedSection: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: "rgba(0,0,0,0.34)",
    paddingHorizontal: 14,
    paddingTop: 14,
    marginTop: 14,
  },
  failedTitle: {
    color: colors.white,
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  failedItem: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  failedCopy: { flex: 1, minWidth: 0, paddingVertical: 10 },
  failedLabel: {
    color: colors.white,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  failedMeta: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  retryButton: {
    minWidth: 64,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.45)",
    marginLeft: 12,
  },
  retryButtonText: {
    color: colors.accent,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  itemError: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 15,
    paddingVertical: 8,
  },
  noticeText: {
    color: colors.mutedStrong,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
  },
  errorTitle: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    textAlign: "center",
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
  },
  cardStage: { marginTop: 18 },
  emptyState: { alignItems: "center", paddingVertical: 64 },
  emptyTitle: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 20,
  },
  emptyText: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
  },
  paging: { flexDirection: "row", gap: 10, marginTop: 28 },
  pageButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.glassBorderStrong,
  },
  pageButtonText: {
    color: colors.white,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  primary: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    backgroundColor: colors.white,
    marginTop: 18,
    paddingHorizontal: 24,
  },
  primaryText: {
    color: colors.black,
    fontFamily: fonts.displayMedium,
    fontSize: 14,
  },
  secondary: { minHeight: 48, justifyContent: "center", paddingHorizontal: 24 },
  secondaryText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 12 },
  preparingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sequenceActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  smallAction: {
    minWidth: 64,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  smallActionText: {
    color: colors.white,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  disabled: { opacity: 0.35 },
});
