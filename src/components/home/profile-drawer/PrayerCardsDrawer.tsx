import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useAuth } from "@clerk/expo";
import { deletePrayerCard, listPrayerCards } from "../../../lib/api";
import { useTheme } from "../../../theme/ThemeProvider";
import type { HomePrayerCard } from "../../../types/home";
import { PrayerDetailModal } from "../PrayerDetailModal";
import {
  InlineError,
  ManageAvatar,
  useProfileStyles,
} from "./ProfileControls";

export function PrayerCardsDrawer({
  visible,
  count,
  onClose,
  onChanged,
}: {
  visible: boolean;
  count: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const styles = useProfileStyles();
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [cards, setCards] = useState<HomePrayerCard[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<HomePrayerCard | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const requireToken = useCallback(async () => {
    const sessionToken = await getTokenRef.current();
    if (!sessionToken) {
      throw new Error("Your session expired. Please sign in again.");
    }
    setToken(sessionToken);
    return sessionToken;
  }, []);

  const load = useCallback(
    async (before?: string) => {
      const paging = Boolean(before);
      if (paging) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }
      try {
        const sessionToken = await requireToken();
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
            : "Unable to load prayer cards",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [requireToken],
  );

  useEffect(() => {
    if (!visible) {
      setSelectedCard(null);
      return;
    }
    void load();
  }, [load, visible]);

  const removeCard = async (prayeruuid: string) => {
    if (pendingId) return;
    setPendingId(prayeruuid);
    setError(null);
    try {
      const sessionToken = await requireToken();
      await deletePrayerCard(prayeruuid, sessionToken);
      setCards((current) =>
        current.filter((card) => card.prayeruuid !== prayeruuid),
      );
      setSelectedCard((current) =>
        current?.prayeruuid === prayeruuid ? null : current,
      );
      await onChanged();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this prayer card",
      );
    } finally {
      setPendingId(null);
    }
  };

  const heading =
    Number(count) === 1 ? "1 prayer card" : `${count} prayer cards`;

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.content}
          data={cards}
          keyExtractor={(card, index) => card.prayeruuid || `prayer-${index}`}
          onEndReached={() => {
            if (!loading && !loadingMore && hasMore && nextBefore) {
              void load(nextBefore);
            }
          }}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <View>
              <Pressable
                accessibilityLabel="Close prayer cards"
                accessibilityRole="button"
                hitSlop={20}
                onPress={onClose}
                style={styles.handle}
              />
              <Text style={styles.sectionTitle}>Prayer cards</Text>
              <Text style={[styles.manageMeta, styles.drawerCount]}>
                {heading}
              </Text>
              <InlineError message={error || undefined} />
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.listStatus}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : (
              <Text style={styles.empty}>
                No prayer cards yet. Daily prayers and loved-one prayers will
                appear here.
              </Text>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.listFooter}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const pending = pendingId === item.prayeruuid;
            return (
              <View style={styles.manageRow}>
                <Pressable
                  accessibilityLabel={`Open ${item.title}`}
                  accessibilityRole="button"
                  onPress={() => setSelectedCard(item)}
                  style={({ pressed }) => [
                    styles.accountSummary,
                    styles.manageRowBody,
                    pressed && styles.accountSummaryPressed,
                  ]}
                >
                  <ManageAvatar label={item.title} source={item.image} />
                  <View style={styles.manageCopy}>
                    <Text numberOfLines={1} style={styles.manageName}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.manageMeta}>
                      {[item.verse, item.date].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Delete ${item.title}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: pending }}
                  disabled={pending || !item.prayeruuid}
                  onPress={() => {
                    if (item.prayeruuid) void removeCard(item.prayeruuid);
                  }}
                  style={[styles.manageActionTouch, pending && styles.disabled]}
                >
                  <Text style={styles.remove}>
                    {pending ? "Deleting…" : "Delete"}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
        <PrayerDetailModal
          card={selectedCard}
          token={token}
          visible={selectedCard !== null}
          onClose={() => setSelectedCard(null)}
        />
      </View>
    </Modal>
  );
}
