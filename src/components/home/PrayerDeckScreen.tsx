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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackIcon } from "../../features/groups/components/Icons";
import {
  archivePrayerDeck,
  generatePrayerCardAudio,
  getPrayerDeck,
  retryPrayerDeckItem,
} from "../../lib/api";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import type {
  HomePrayerCard,
  PrayerDeckCard,
  PrayerDeckDetail,
} from "../../types/home";
import { KenBurnsImage } from "../ui/KenBurnsImage";
import { GridOverlay } from "../ui/GridOverlay";
import {
  PrayerDeckPager,
  type PrayerDeckPagerHandle,
} from "./PrayerDeckPager";
import { PrayerDetailModal } from "./PrayerDetailModal";

export function PrayerDeckScreen({
  deckuuid,
  onClose,
  onFinished,
}: {
  deckuuid: string;
  onClose: () => void;
  onFinished: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const getTokenRef = useRef(getToken);
  const pagerRef = useRef<PrayerDeckPagerHandle>(null);
  const [token, setToken] = useState<string | null>(null);
  const [deck, setDeck] = useState<PrayerDeckDetail | null>(null);
  const [cards, setCards] = useState<PrayerDeckCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<HomePrayerCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailNavigationDirection, setDetailNavigationDirection] = useState<
    -1 | 1
  >(1);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
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
    const nextIndex = currentIndex + direction;
    const nextCard = cards[nextIndex];
    if (!nextCard) return;
    setDetailNavigationDirection(direction);
    setCurrentIndex(nextIndex);
    prepareIndividualAudio(nextCard);
  };

  const finishPraying = async () => {
    if (!token || finishing) return;
    setFinishing(true);
    setFinishError(null);
    try {
      await archivePrayerDeck(deckuuid, token);
      onFinished();
    } catch (err) {
      setFinishError(
        err instanceof Error ? err.message : "Unable to finish this prayer deck.",
      );
    } finally {
      setFinishing(false);
    }
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
  const completed = currentIndex + 1;
  const progress = cards.length ? Math.min(1, completed / cards.length) : 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.title} size="large" />
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
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <KenBurnsImage
            debugLabel="prayer-deck"
            path={currentCard.image}
            paths={currentCard.images}
            style={StyleSheet.absoluteFill}
            crossfadeDurationMs={360}
            kenBurnsDurationMs={10_000}
          />
        </View>
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
          <BackIcon color={colors.title} size={18} />
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
            disabled={currentIndex === 0}
            onPress={() => pagerRef.current?.previous()}
            style={[
              styles.pageButton,
              currentIndex === 0 && styles.disabled,
            ]}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: currentIndex >= cards.length - 1 }}
            disabled={currentIndex >= cards.length - 1}
            onPress={() => pagerRef.current?.next()}
            style={[
              styles.pageButton,
              currentIndex >= cards.length - 1 && styles.disabled,
            ]}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </Pressable>
        </View>

        {finishError ? (
          <View style={styles.errorNotice}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {finishError}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: finishing, disabled: !token || finishing }}
          disabled={!token || finishing}
          onPress={() => void finishPraying()}
          style={[styles.primary, (!token || finishing) && styles.disabled]}
        >
          {finishing ? (
            <ActivityIndicator color={colors.buttonOnPrimary} size="small" />
          ) : (
            <Text style={styles.primaryText}>Finished Praying</Text>
          )}
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
        deckPosition={
          selectedCard && cards.length > 1
            ? `${currentIndex + 1} of ${cards.length}`
            : undefined
        }
        navigationContext="daily-prayer-deck"
        navigationDirection={detailNavigationDirection}
        onPrevious={currentIndex > 0 ? () => showAdjacentCard(-1) : undefined}
        onNext={
          currentIndex < cards.length - 1
            ? () => showAdjacentCard(1)
            : undefined
        }
        onClose={() => setSelectedCard(null)}
      />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
    padding: 24,
  },
  overlay: { backgroundColor: colors.overlayDeck },
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
    color: colors.accentText,
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
    backgroundColor: colors.overlayControl,
    paddingHorizontal: 14,
    paddingTop: 14,
    marginTop: 14,
  },
  failedTitle: {
    color: colors.title,
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
    color: colors.title,
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
    borderColor: colors.accentBorderPill,
    marginLeft: 12,
  },
  retryButtonText: {
    color: colors.accentText,
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
    color: colors.title,
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
  cardStage: { marginTop: 10 },
  emptyState: { alignItems: "center", paddingVertical: 64 },
  emptyTitle: {
    color: colors.title,
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
  paging: { flexDirection: "row", gap: 8, marginTop: 14 },
  pageButton: {
    minHeight: 32,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorderStrong,
    paddingVertical: 6,
  },
  pageButtonText: {
    color: colors.title,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
  },
  primary: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.buttonPrimary,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  primaryText: {
    color: colors.buttonOnPrimary,
    fontFamily: fonts.displayMedium,
    fontSize: 12,
  },
  secondary: { minHeight: 48, justifyContent: "center", paddingHorizontal: 24 },
  secondaryText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 12 },
  disabled: { opacity: 0.35 },
  });
}
