import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { colors, fonts } from "../../theme/tokens";
import { images, resolveImage } from "../../lib/assets";
import {
  addLovedOne,
  generateLovedOnePrayer,
  getMobileHome,
  saveLovedOneConfig,
} from "../../lib/api";
import { GridOverlay } from "../ui/GridOverlay";
import { DisplayTitle } from "../ui/DisplayTitle";
import { PrayerCard } from "../ui/PrayerCard";
import { LovedOne } from "../ui/LovedOne";
import { ChiRhoMark } from "../ui/ChiRhoMark";
import { AddLovedOneModal } from "./AddLovedOneModal";
import { PrayerDetailModal } from "./PrayerDetailModal";
import { ProfileDrawer } from "./ProfileDrawer";
import type {
  HomeData,
  HomeLovedOne,
  HomePrayerCard,
  MobileHomeResponse,
} from "../../types/home";

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const { user } = useUser();
  const firstName = user?.firstName || "friend";
  const [response, setResponse] = useState<MobileHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<HomePrayerCard | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [addLovedOneOpen, setAddLovedOneOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingLovedOne, setSavingLovedOne] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const loadHome = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const token = await getTokenRef.current();
        if (!token) throw new Error("Your session expired. Please sign in again.");
        setSessionToken(token);
        setResponse(await getMobileHome(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load your home");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const home: HomeData | null = response?.home || null;
  const background = response?.community?.backgroundImage
    ? resolveImage(response.community.backgroundImage)
    : images.intro;

  const handleLovedOnePress = async (person: HomeLovedOne) => {
    const backgroundImage = person.backgroundImage || "/cover1.jpg";
    setSelectedCard({
      title: `Prayer for ${person.name}`,
      verse: person.intention,
      text: `Preparing a prayer for ${person.name}...`,
      image: backgroundImage,
    });
    setPrayerLoading(true);
    try {
      const token = sessionToken || (await getToken());
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const textPrayer = await generateLovedOnePrayer(
        person.id,
        backgroundImage,
        token,
        true,
      );
      setSelectedCard(textPrayer);
      setPrayerLoading(false);
      generateLovedOnePrayer(person.id, backgroundImage, token, false)
        .then((audioPrayer) => {
          if (audioPrayer.prayeruuid) {
            setSelectedCard((current) =>
              current ? { ...current, prayeruuid: audioPrayer.prayeruuid } : current,
            );
          }
        })
        .catch(() => undefined);
    } catch (err) {
      setPrayerLoading(false);
      setSelectedCard({
        title: `Prayer for ${person.name}`,
        verse: "",
        text:
          err instanceof Error
            ? err.message
            : "Unable to generate a prayer. Please try again.",
        image: backgroundImage,
      });
    }
  };

  const handleAddLovedOne = async (name: string, categories: string[]) => {
    setSavingLovedOne(true);
    setMutationError(null);
    try {
      const token = sessionToken || (await getToken());
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const lovedOne = await addLovedOne(name, token);
      if (categories.length) {
        await saveLovedOneConfig(lovedOne.id, categories, token);
      }
      await loadHome(true);
      setAddLovedOneOpen(false);
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Unable to add loved one");
    } finally {
      setSavingLovedOne(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image source={background} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.8)" }]} />
      <GridOverlay />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: 140 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHome(true)}
            tintColor={colors.white}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <DisplayTitle title="Welcome" subtitle={`${firstName}!`} />

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.white} />
            <Text style={styles.loadingText}>Gathering your prayers...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load your home</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => loadHome()} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.section}>Recent Prayer Cards</Text>
            {home?.cards.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rail}
              >
                {home.cards.map((card, i) => (
                  <PrayerCard
                    key={card.prayeruuid || `${card.title}-${i}`}
                    card={card}
                    index={i}
                    onPress={() => setSelectedCard(card)}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.empty}>
                Your recent prayers will appear here.
              </Text>
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.section}>Pray for Loved Ones</Text>
              <Pressable
                accessibilityLabel="Add a loved one"
                accessibilityRole="button"
                onPress={() => setAddLovedOneOpen(true)}
                style={({ pressed }) => [styles.plus, pressed && styles.pressed]}
              >
                <Text style={styles.plusText}>+</Text>
              </Pressable>
            </View>
            {home?.lovedOnes.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.lovedRail}
              >
                {home.lovedOnes.map((person) => (
                  <LovedOne
                    key={person.id}
                    person={person}
                    showIntention={false}
                    onPress={() => handleLovedOnePress(person)}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.empty}>
                Add someone you would like to pray for.
              </Text>
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.section}>Prayer Groups</Text>
            </View>
            {home?.groups.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rail}
              >
                {home.groups.map((group) => (
                  <Pressable
                    key={group.groupuuid}
                    accessibilityLabel={`Open ${group.name}`}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/groups/[groupuuid]",
                        params: { groupuuid: group.groupuuid },
                      })
                    }
                    style={({ pressed }) => [
                      styles.groupCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Image
                      source={resolveImage(group.image)}
                      style={styles.groupImg}
                      contentFit="cover"
                    />
                    {group.prayerCount ? (
                      <View style={styles.groupBadge}>
                        <Text style={styles.groupBadgeText}>{group.prayerCount}</Text>
                      </View>
                    ) : null}
                    {group.hasNotification ? (
                      <View style={styles.groupNotification} />
                    ) : null}
                    <View style={styles.groupBar}>
                      <View style={styles.groupNameRow}>
                        <Text style={styles.groupName} numberOfLines={1}>
                          {group.name}
                        </Text>
                        {group.newPrayers ? (
                          <View style={styles.groupNewBadge}>
                            <Text style={styles.groupNewBadgeText}>
                              {group.newPrayers}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.groupMembers}>{group.members} members</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.empty}>
                Your prayer groups will appear here.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          accessibilityLabel="Open profile and settings"
          accessibilityRole="button"
          onPress={() => setProfileOpen(true)}
          style={styles.navLeft}
        >
          {home?.profile.avatar ? (
            <Image
              source={resolveImage(home.profile.avatar)}
              style={styles.navAvatar}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.navN}>
              {(home?.profile.name || firstName).slice(0, 1).toUpperCase()}
            </Text>
          )}
        </Pressable>
        <View style={styles.navCenter}>
          <ChiRhoMark width={28} height={36} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <PrayerDetailModal
        card={selectedCard}
        token={sessionToken}
        visible={selectedCard !== null}
        loading={prayerLoading}
        onClose={() => {
          setSelectedCard(null);
          setPrayerLoading(false);
        }}
      />
      <AddLovedOneModal
        visible={addLovedOneOpen}
        saving={savingLovedOne}
        error={mutationError}
        onClose={() => setAddLovedOneOpen(false)}
        onSubmit={handleAddLovedOne}
      />
      <ProfileDrawer
        visible={profileOpen}
        profile={home?.profile || null}
        groups={home?.groups || []}
        community={response?.community || null}
        onClose={() => setProfileOpen(false)}
        onChanged={() => loadHome(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    paddingHorizontal: 24,
  },
  loading: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  errorCard: {
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorBg,
    padding: 18,
  },
  errorTitle: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    marginBottom: 6,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  retry: {
    alignSelf: "flex-start",
    borderRadius: 18,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 14,
  },
  retryText: {
    color: colors.black,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  empty: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: 12,
  },
  section: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
    marginBottom: 10,
    marginTop: 8,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  plus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  rail: {
    gap: 12,
    paddingBottom: 8,
  },
  lovedRail: {
    gap: 16,
    paddingBottom: 8,
  },
  groupCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.glassFillHover,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  groupImg: {
    width: "100%",
    height: 70,
  },
  groupBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.badgeOrange,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  groupBadgeText: {
    color: colors.white,
    fontFamily: fonts.monoMedium,
    fontSize: 8,
    fontWeight: "600",
  },
  groupNotification: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  groupBar: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  groupName: {
    flexShrink: 1,
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 11,
    fontWeight: "500",
  },
  groupNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupNewBadge: {
    marginLeft: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  groupNewBadgeText: {
    color: colors.white,
    fontFamily: fonts.bodySemi,
    fontSize: 7,
  },
  groupMembers: {
    color: colors.mutedFaint,
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  nav: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(20,20,20,0.72)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingTop: 10,
    minHeight: 64,
  },
  navLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  navN: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 16,
  },
  navAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  navCenter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
  },
});
