import { useCallback, useEffect, useRef, useState } from "react";
import {
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
  generatePrayerCardAudio,
  getMobileHome,
  saveLovedOneConfig,
} from "../../lib/api";
import { GridOverlay } from "../ui/GridOverlay";
import { DisplayTitle } from "../ui/DisplayTitle";
import { PrayerCard } from "../ui/PrayerCard";
import { LovedOne } from "../ui/LovedOne";
import { LoadingChiRhoOverlay } from "../ui/LoadingChiRhoOverlay";
import { AddLovedOneModal } from "./AddLovedOneModal";
import { PrayerDetailModal } from "./PrayerDetailModal";
import { ProfileDrawer } from "./ProfileDrawer";
import type {
  HomeData,
  HomeLovedOne,
  HomePrayerCard,
  MobileHomeResponse,
} from "../../types/home";

async function prefetchHomeImages(result: MobileHomeResponse) {
  const paths = [
    result.community?.backgroundImage,
    ...result.home.cards.slice(0, 2).map((card) => card.image),
    ...result.home.lovedOnes.slice(0, 5).map((person) => person.avatar),
    ...result.home.groups.slice(0, 3).map((group) => group.image),
  ];
  const uris = Array.from(
    new Set(
      paths
        .map((path) => {
          const source = resolveImage(path);
          return typeof source === "object" &&
            source !== null &&
            "uri" in source &&
            typeof source.uri === "string"
            ? source.uri
            : null;
        })
        .filter((uri): uri is string => Boolean(uri)),
    ),
  );
  if (!uris.length) return;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 2000);
    Promise.allSettled(uris.map((uri) => Image.prefetch(uri))).then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

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
  const generatingLovedOneRef = useRef(false);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const requireCurrentToken = useCallback(async () => {
    const token = await getTokenRef.current();
    if (!token) {
      throw new Error("Your session expired. Please sign in again.");
    }
    setSessionToken(token);
    return token;
  }, []);

  const loadHome = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const token = await requireCurrentToken();
        const result = await getMobileHome(token);
        setResponse(result);
        if (!refresh) await prefetchHomeImages(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load your home");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [requireCurrentToken],
  );

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const home: HomeData | null = response?.home || null;
  const background = response?.community?.backgroundImage
    ? resolveImage(response.community.backgroundImage)
    : images.intro;

  const handleLovedOnePress = async (person: HomeLovedOne) => {
    if (generatingLovedOneRef.current) return;
    generatingLovedOneRef.current = true;
    const backgroundImage = person.backgroundImage || "/cover1.jpg";
    setSelectedCard({
      title: `Prayer for ${person.name}`,
      verse: person.intention,
      text: `Preparing a prayer for ${person.name}...`,
      image: backgroundImage,
    });
    setPrayerLoading(true);
    try {
      const token = await requireCurrentToken();
      const prayer = await generateLovedOnePrayer(
        person.id,
        backgroundImage,
        token,
        true,
      );
      setSelectedCard(prayer);
      setPrayerLoading(false);

      void generatePrayerCardAudio(prayer.prayeruuid!, token)
        .then((audio) => {
          setSelectedCard((current) => {
            if (!current || current.prayeruuid !== prayer.prayeruuid) {
              return current;
            }
            return {
              ...current,
              narrationUrl: audio.narrationUrl || undefined,
              backgroundMusicUrl:
                audio.backgroundMusicUrl || current.backgroundMusicUrl,
              backgroundMusicVolume: audio.backgroundMusicVolume,
              audioAvailable: audio.audioStatus === "ready",
              audioStatus: audio.audioStatus,
            };
          });
        })
        .catch(() => {
          setSelectedCard((current) => {
            if (!current || current.prayeruuid !== prayer.prayeruuid) {
              return current;
            }
            return { ...current, audioStatus: "failed" };
          });
        });
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
    } finally {
      generatingLovedOneRef.current = false;
    }
  };

  const handleAddLovedOne = async (name: string, categories: string[]) => {
    setSavingLovedOne(true);
    setMutationError(null);
    try {
      const token = await requireCurrentToken();
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

  if (loading) {
    return (
      <View style={styles.root}>
        <LoadingChiRhoOverlay
          label="Gathering your prayers…"
          visible
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Image source={background} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.8)" }]} />
      <GridOverlay />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: 104 + insets.bottom },
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

        {error && !home ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load your home</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => loadHome()} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : home ? (
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
                    compact
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
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityLabel="Open profile and settings"
        accessibilityRole="button"
        onPress={() => setProfileOpen(true)}
        style={({ pressed }) => [
          styles.profileTrigger,
          { bottom: Math.max(insets.bottom, 12) },
          pressed && styles.pressed,
        ]}
      >
        {home?.profile.avatar ? (
          <Image
            source={resolveImage(home.profile.avatar)}
            style={styles.profileTriggerAvatar}
            contentFit="cover"
          />
        ) : (
          <Text style={styles.navN}>
            {(home?.profile.name || firstName).slice(0, 1).toUpperCase()}
          </Text>
        )}
      </Pressable>

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
        lovedOnes={home?.lovedOnes || []}
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
    color: colors.cardMeta,
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
    flexGrow: 1,
    justifyContent: "center",
    gap: 8,
    paddingBottom: 8,
  },
  groupCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.cardFill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    backgroundColor: colors.cardFill,
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
    color: colors.cardMeta,
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  profileTrigger: {
    position: "absolute",
    left: "50%",
    marginLeft: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  navN: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 16,
  },
  profileTriggerAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
});
