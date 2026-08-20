import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
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
import { useRouter, type Href } from "expo-router";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { privateImageCachePolicy, resolveImage } from "../../lib/assets";
import { parseAppearance } from "../../lib/appearancePreference";
import { selectedDashboardBackgrounds } from "../../lib/dashboardBackgrounds";
import { setBackgroundMusicEnabled } from "../../lib/backgroundMusicPreference";
import {
  addLovedOne,
  createGroup,
  createPrayerFocus,
  generateLovedOnePrayer,
  generatePrayerCardAudio,
  getLovedOnePhotos,
  getMobileHome,
  saveLovedOneConfig,
  uploadLovedOnePhoto,
  updatePrayerFocus,
} from "../../lib/api";
import { GridOverlay } from "../ui/GridOverlay";
import { PrayerCard } from "../ui/PrayerCard";
import { LovedOne } from "../ui/LovedOne";
import { KenBurnsImage, lovedOneImagePaths } from "../ui/KenBurnsImage";
import { LoadingChiRhoOverlay } from "../ui/LoadingChiRhoOverlay";
import { AddLovedOneModal } from "./AddLovedOneModal";
import { CreateGroupModal } from "./CreateGroupModal";
import { LovedOnePhotosModal } from "./LovedOnePhotosModal";
import { PrayerDetailModal } from "./PrayerDetailModal";
import { PrayerFocusModal } from "./PrayerFocusModal";
import { PrayerFocusTypeIcon } from "./PrayerFocusTypeIcon";
import { ProfileDrawer } from "./ProfileDrawer";
import type {
  HomeData,
  HomeLovedOne,
  HomePrayerCard,
  MobileHomeResponse,
  PrayerFocus,
  PrayerFocusInput,
} from "../../types/home";
import { communityAllowsPersonalPrayer } from "../../types/home";

async function prefetchHomeImages(result: MobileHomeResponse, token: string) {
  const paths = [
    ...selectedDashboardBackgrounds(
      result.community?.backgroundImage,
      result.home.profile.dashboardBackgrounds,
    ),
    ...result.home.cards.slice(0, 2).map((card) => card.image),
    ...result.home.lovedOnes
      .slice(0, 5)
      .flatMap((person) => lovedOneImagePaths(person)),
    ...result.home.groups.slice(0, 3).map((group) => group.image),
  ];
  const sources = paths
    .map((path) => {
      const source = resolveImage(path, token);
      return typeof source === "object" &&
        source !== null &&
        "uri" in source &&
        typeof source.uri === "string"
        ? { path, source }
        : null;
    })
    .filter(
      (
        item,
      ): item is {
        path: string | null | undefined;
        source: { uri: string; headers?: Record<string, string> };
      } => Boolean(item),
    )
    .filter(
      (item, index, all) =>
        all.findIndex(
          (candidate) => candidate.source.uri === item.source.uri,
        ) === index,
    );
  if (!sources.length) return;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 2000);
    Promise.allSettled(
      sources.map(({ path, source }) =>
        Image.prefetch(source.uri, {
          cachePolicy: privateImageCachePolicy(path) ?? "memory-disk",
          headers: source.headers,
        }),
      ),
    ).then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function hydrateLovedOnePhotos(
  result: MobileHomeResponse,
  token: string,
): Promise<MobileHomeResponse> {
  const lovedOnes = await Promise.all(
    result.home.lovedOnes.map(async (person) => {
      const photos = Array.isArray(person.photos)
        ? person.photos
        : await getLovedOnePhotos(person.id, token).catch(() => []);
      return {
        ...person,
        photos,
        primaryPhoto:
          photos.find((photo) => photo.isPrimary) ||
          photos[0] ||
          person.primaryPhoto ||
          null,
      };
    }),
  );
  const photosById = new Map<string, string[]>();
  const photosByName = new Map<string, string[]>();
  for (const person of lovedOnes) {
    const paths = (person.photos || [])
      .slice()
      .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary))
      .map((photo) => photo.contentPath)
      .filter(Boolean);
    if (person.primaryPhoto?.contentPath && !paths.includes(person.primaryPhoto.contentPath)) {
      paths.unshift(person.primaryPhoto.contentPath);
    }
    if (!paths.length) continue;
    photosById.set(person.id, paths);
    photosByName.set(person.name.trim().toLowerCase(), paths);
  }

  return {
    ...result,
    home: {
      ...result.home,
      lovedOnes,
      cards: result.home.cards.map((card, index) => {
        const fromId =
          card.subjectType === "loved_one" && card.subjectId
            ? photosById.get(card.subjectId)
            : undefined;
        const fromTitle =
          card.title.match(/\bfor\s+(.+)$/i)?.[1]?.trim().toLowerCase() ||
          (card.subjectType === "loved_one"
            ? card.title.trim().toLowerCase()
            : undefined);
        const paths = fromId || (fromTitle ? photosByName.get(fromTitle) : undefined);
        if (!paths?.length) return card;
        return {
          ...card,
          image: paths[index % paths.length],
          images: paths,
        };
      }),
    },
  };
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const styles = useThemedStyles(createStyles);
  const { colors, setAppearance } = useTheme();
  const getTokenRef = useRef(getToken);
  const { user } = useUser();
  const firstName = user?.firstName || "friend";
  const [response, setResponse] = useState<MobileHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<HomePrayerCard | null>(null);
  const [detailNavigationDirection, setDetailNavigationDirection] = useState<
    -1 | 1
  >(1);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [addLovedOneOpen, setAddLovedOneOpen] = useState(false);
  const [photoLovedOne, setPhotoLovedOne] = useState<{
    id: string;
    firstName: string;
  } | null>(null);
  const pendingPhotoLovedOneRef = useRef<{
    id: string;
    firstName: string;
  } | null>(null);
  const photoModalFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [prayerFocusOpen, setPrayerFocusOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<PrayerFocus | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingLovedOne, setSavingLovedOne] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const generatingLovedOneRef = useRef(false);
  const showPersonalPrayer = communityAllowsPersonalPrayer(
    response?.community,
  );

  useEffect(() => {
    console.info("[HomeFeatures]", {
      hasCommunity: Boolean(response?.community),
      communityuuid: response?.community?.communityuuid ?? null,
      name: response?.community?.name ?? null,
      licenseTier: response?.community?.licenseTier ?? null,
      personalPrayer: response?.community?.features?.personalPrayer ?? null,
      dailyPrayers: response?.community?.features?.dailyPrayers ?? null,
      showPersonalPrayer,
      features: response?.community?.features ?? null,
    });
  }, [response, showPersonalPrayer]);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const openQueuedPhotoModal = useCallback(() => {
    const lovedOne = pendingPhotoLovedOneRef.current;
    if (!lovedOne) return;
    pendingPhotoLovedOneRef.current = null;
    if (photoModalFallbackRef.current) {
      clearTimeout(photoModalFallbackRef.current);
      photoModalFallbackRef.current = null;
    }
    setPhotoLovedOne(lovedOne);
  }, []);

  const queuePhotoModal = useCallback(
    (lovedOne: { id: string; firstName: string }) => {
      pendingPhotoLovedOneRef.current = lovedOne;
      if (Platform.OS !== "ios") {
        if (photoModalFallbackRef.current) {
          clearTimeout(photoModalFallbackRef.current);
        }
        photoModalFallbackRef.current = setTimeout(openQueuedPhotoModal, 400);
      }
    },
    [openQueuedPhotoModal],
  );

  useEffect(
    () => () => {
      if (photoModalFallbackRef.current) {
        clearTimeout(photoModalFallbackRef.current);
      }
    },
    [],
  );

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
        const result = await hydrateLovedOnePhotos(
          await getMobileHome(token),
          token,
        );
        console.info("[HomeFeatures] home payload", {
          hasCommunity: Boolean(result.community),
          communityuuid: result.community?.communityuuid ?? null,
          name: result.community?.name ?? null,
          licenseTier: result.community?.licenseTier ?? null,
          personalPrayer: result.community?.features?.personalPrayer ?? null,
          dailyPrayers: result.community?.features?.dailyPrayers ?? null,
          allowPersonalPrayer: communityAllowsPersonalPrayer(result.community),
        });
        setResponse(result);
        if (!refresh) await prefetchHomeImages(result, token);
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

  useEffect(() => {
    if (typeof home?.profile.backgroundMusicEnabled !== "boolean") return;
    setBackgroundMusicEnabled(home.profile.backgroundMusicEnabled);
  }, [home?.profile.backgroundMusicEnabled]);

  useEffect(() => {
    const theme = home?.profile.appSettings.theme;
    if (theme !== "light" && theme !== "dark") return;
    setAppearance(parseAppearance(theme));
  }, [home?.profile.appSettings.theme, setAppearance]);
  const selectedCardIndex =
    selectedCard && home
      ? home.cards.findIndex((card) =>
          selectedCard.prayeruuid
            ? card.prayeruuid === selectedCard.prayeruuid
            : card === selectedCard,
        )
      : -1;
  const dashboardBackgrounds = selectedDashboardBackgrounds(
    response?.community?.backgroundImage,
    home?.profile.dashboardBackgrounds,
  );

  const showAdjacentRecentPrayer = (direction: -1 | 1) => {
    if (!home || selectedCardIndex < 0) return;
    const nextCard = home.cards[selectedCardIndex + direction];
    if (!nextCard) return;
    if (__DEV__) {
      console.info("[PrayerSwipe] Home recent prayer navigation", {
        direction: direction === 1 ? "next" : "previous",
        from: selectedCardIndex,
        to: selectedCardIndex + direction,
        prayeruuid: nextCard.prayeruuid,
      });
    }
    setDetailNavigationDirection(direction);
    setSelectedCard(nextCard);
  };

  const updatePrayerCard = (
    prayeruuid: string,
    updates: Partial<HomePrayerCard>,
  ) => {
    setSelectedCard((current) =>
      current?.prayeruuid === prayeruuid ? { ...current, ...updates } : current,
    );
    setResponse((current) =>
      current
        ? {
            ...current,
            home: {
              ...current.home,
              cards: current.home.cards.map((card) =>
                card.prayeruuid === prayeruuid
                  ? { ...card, ...updates }
                  : card,
              ),
            },
          }
        : current,
    );
  };

  const handleLovedOnePress = async (person: HomeLovedOne) => {
    if (generatingLovedOneRef.current) return;
    generatingLovedOneRef.current = true;
    const images = lovedOneImagePaths(person);
    const backgroundImage = images[0] || "/cover1.jpg";
    const timeOfDayLabel =
      new Date().getHours() < 12 ? "Morning Prayer" : "Evening Prayer";
    setSelectedCard({
      title: person.name,
      verse: timeOfDayLabel,
      text: `Preparing a prayer for ${person.name}...`,
      image: backgroundImage,
      images,
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
      const pendingPrayer = {
        ...prayer,
        image: images[0] || prayer.image,
        images,
        audioStatus: "pending" as const,
      };
      setSelectedCard(pendingPrayer);
      setResponse((current) =>
        current
          ? {
              ...current,
              home: {
                ...current.home,
                cards: [
                  pendingPrayer,
                  ...current.home.cards.filter(
                    (card) => card.prayeruuid !== prayer.prayeruuid,
                  ),
                ].slice(0, 5),
              },
            }
          : current,
      );
      setPrayerLoading(false);

      void generatePrayerCardAudio(prayer.prayeruuid!, token)
        .then((audio) => {
          updatePrayerCard(prayer.prayeruuid!, {
            narrationUrl: audio.narrationUrl,
            backgroundMusicUrl:
              audio.backgroundMusicUrl || prayer.backgroundMusicUrl,
            backgroundMusicVolume: audio.backgroundMusicVolume,
            audioAvailable: audio.audioStatus === "ready",
            audioStatus: audio.audioStatus,
          });
        })
        .catch(() => {
          updatePrayerCard(prayer.prayeruuid!, {
            audioAvailable: false,
            audioStatus: "failed",
          });
        });
    } catch (err) {
      setPrayerLoading(false);
      setSelectedCard({
        title: person.name,
        verse: timeOfDayLabel,
        text:
          err instanceof Error
            ? err.message
            : "Unable to generate a prayer. Please try again.",
        image: backgroundImage,
        images,
      });
    } finally {
      generatingLovedOneRef.current = false;
    }
  };

  const handleAddLovedOne = async (
    name: string,
    categories: string[],
    photoDataUris: string[] = [],
  ) => {
    setSavingLovedOne(true);
    setMutationError(null);
    try {
      const token = await requireCurrentToken();
      const lovedOne = await addLovedOne(name, token);
      if (categories.length) {
        await saveLovedOneConfig(lovedOne.id, categories, token);
      }
      for (const imageData of photoDataUris) {
        await uploadLovedOnePhoto(lovedOne.id, imageData, token);
      }
      await loadHome(true);
      setAddLovedOneOpen(false);
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Unable to add loved one");
    } finally {
      setSavingLovedOne(false);
    }
  };

  const handleCreateGroup = async (name: string) => {
    setSavingGroup(true);
    setMutationError(null);
    try {
      const token = await requireCurrentToken();
      const group = await createGroup(name, token);
      await loadHome(true);
      setCreateGroupOpen(false);
      router.push({
        pathname: "/(app)/groups/[groupuuid]",
        params: { groupuuid: group.groupuuid },
      });
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : "Unable to create this group",
      );
    } finally {
      setSavingGroup(false);
    }
  };

  const handleSavePrayerFocus = async (input: PrayerFocusInput) => {
    setSavingLovedOne(true);
    setMutationError(null);
    try {
      const token = await requireCurrentToken();
      if (selectedFocus) {
        await updatePrayerFocus(selectedFocus.focusuuid, input, token);
      } else {
        await createPrayerFocus(input, token);
      }
      await loadHome(true);
      setPrayerFocusOpen(false);
      setSelectedFocus(null);
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : "Unable to save prayer focus",
      );
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
      <KenBurnsImage
        path={dashboardBackgrounds[0]}
        paths={dashboardBackgrounds}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
      <GridOverlay />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: 32 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHome(true)}
            tintColor={colors.title}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcome}>
          <Pressable
            accessibilityLabel="Open profile and settings"
            accessibilityRole="button"
            onPress={() => setProfileOpen(true)}
            style={({ pressed }) => [
              styles.profileTrigger,
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
          <View style={styles.welcomeCopy}>
            <Text style={styles.welcomeGreeting}>{daypartGreeting()}</Text>
            <Text style={styles.welcomeName}>{firstName}!</Text>
          </View>
        </View>

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
            {showPersonalPrayer && home.dailyDeck ? (
              <>
                <Text style={styles.section}>Today's Prayer Deck</Text>
                <Pressable
                  accessibilityLabel={`Open ${home.dailyDeck.timeOfDay} prayer deck`}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(
                      `/(app)/prayer-decks/${home.dailyDeck!.deckuuid}` as Href,
                    )
                  }
                  style={({ pressed }) => [
                    styles.deckCard,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.deckCopy}>
                    <Text style={styles.deckEyebrow}>
                      {home.dailyDeck.timeOfDay} · {home.dailyDeck.status}
                    </Text>
                    <Text style={styles.deckTitle}>
                      {home.dailyDeck.labels.join(" · ") || "Daily prayers"}
                    </Text>
                    <Text style={styles.deckMeta}>
                      {home.dailyDeck.readyCards} of {home.dailyDeck.totalCards} ready
                    </Text>
                  </View>
                  <Text style={styles.deckArrow}>→</Text>
                </Pressable>
              </>
            ) : null}

            {showPersonalPrayer ? (
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
                    onPress={() => {
                      setDetailNavigationDirection(1);
                      setSelectedCard(card);
                    }}
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
              <Text style={styles.section}>Prayer Focuses</Text>
              <Pressable
                accessibilityLabel="Add a prayer focus"
                accessibilityRole="button"
                onPress={() => {
                  setMutationError(null);
                  setSelectedFocus(null);
                  setPrayerFocusOpen(true);
                }}
                style={({ pressed }) => [styles.plus, pressed && styles.pressed]}
              >
                <Text style={styles.plusText}>+</Text>
              </Pressable>
            </View>
            {home.prayerFocuses.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.focusRail}
              >
                {home.prayerFocuses.map((focus) => (
                  <Pressable
                    key={focus.focusuuid}
                    accessibilityLabel={`Edit prayer focus ${focus.title}`}
                    accessibilityRole="button"
                    onPress={() => {
                      setMutationError(null);
                      setSelectedFocus(focus);
                      setPrayerFocusOpen(true);
                    }}
                    style={({ pressed }) => [
                      styles.focusCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.focusIcon}>
                      <PrayerFocusTypeIcon
                        type={focus.type}
                        color={colors.accent}
                        size={18}
                      />
                    </View>
                    <Text numberOfLines={1} style={styles.focusTitle}>
                      {focus.title}
                    </Text>
                    <Text style={styles.focusPeriod}>{focus.period}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.empty}>
                Add a focus to include in your daily prayer deck.
              </Text>
            )}
              </>
            ) : null}

            <View style={styles.sectionRow}>
              <Text style={styles.section}>Prayer Groups</Text>
              {!response?.community ||
              response.community.createBlockedReason !== "members" ? (
                <Pressable
                  accessibilityLabel="Start a prayer group"
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: response?.community?.canCreateGroups === false,
                  }}
                  onPress={() => {
                    if (response?.community?.canCreateGroups === false) {
                      Alert.alert(
                        "Group limit reached",
                        response.community.createBlockedReason === "user_limit"
                          ? "You have reached the group limit for this church."
                          : "This church’s plan does not include more groups.",
                      );
                      return;
                    }
                    setMutationError(null);
                    setCreateGroupOpen(true);
                  }}
                  style={({ pressed }) => [
                    styles.plus,
                    pressed && styles.pressed,
                    response?.community?.canCreateGroups === false &&
                      styles.plusDisabled,
                  ]}
                >
                  <Text style={styles.plusText}>+</Text>
                </Pressable>
              ) : null}
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
                    <KenBurnsImage
                      path={group.image}
                      style={styles.groupImg}
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

      <PrayerDetailModal
        card={selectedCard}
        token={sessionToken}
        visible={selectedCard !== null}
        loading={prayerLoading}
        deckPosition={
          selectedCardIndex >= 0 && home && home.cards.length > 1
            ? `${selectedCardIndex + 1} of ${home.cards.length}`
            : undefined
        }
        navigationContext="home-recent-prayers"
        navigationDirection={detailNavigationDirection}
        onPrevious={
          selectedCardIndex > 0
            ? () => showAdjacentRecentPrayer(-1)
            : undefined
        }
        onNext={
          home && selectedCardIndex >= 0 && selectedCardIndex < home.cards.length - 1
            ? () => showAdjacentRecentPrayer(1)
            : undefined
        }
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
        onDismiss={openQueuedPhotoModal}
        onSubmit={handleAddLovedOne}
      />
      <LovedOnePhotosModal
        visible={photoLovedOne !== null}
        lovedOne={photoLovedOne}
        onClose={() => setPhotoLovedOne(null)}
        onChanged={() => loadHome(true)}
      />
      <CreateGroupModal
        visible={createGroupOpen}
        saving={savingGroup}
        error={createGroupOpen ? mutationError : null}
        onClose={() => setCreateGroupOpen(false)}
        onSubmit={handleCreateGroup}
      />
      <PrayerFocusModal
        visible={prayerFocusOpen}
        focus={selectedFocus}
        saving={savingLovedOne}
        error={mutationError}
        nextOrder={
          Math.max(-1, ...(home?.prayerFocuses.map((focus) => focus.order) || [])) +
          1
        }
        onClose={() => {
          setPrayerFocusOpen(false);
          setSelectedFocus(null);
        }}
        onSubmit={handleSavePrayerFocus}
      />
      <ProfileDrawer
        visible={profileOpen}
        profile={home?.profile || null}
        lovedOnes={home?.lovedOnes || []}
        prayerFocuses={home?.prayerFocuses || []}
        groups={home?.groups || []}
        community={response?.community || null}
        onClose={() => setProfileOpen(false)}
        onDismiss={openQueuedPhotoModal}
        onChanged={() => loadHome(true)}
        onManageLovedOnePhotos={(lovedOne) => {
          queuePhotoModal(lovedOne);
          setProfileOpen(false);
        }}
      />
    </View>
  );
}

function daypartGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    paddingHorizontal: 24,
  },
  welcome: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  welcomeCopy: {
    flex: 1,
    minWidth: 0,
  },
  welcomeGreeting: {
    fontFamily: fonts.mono,
    fontSize: 8.8,
    color: colors.accentText,
    textTransform: "uppercase",
    letterSpacing: 0.44,
    marginBottom: 4,
  },
  welcomeName: {
    fontFamily: fonts.displayMedium,
    fontSize: 36,
    lineHeight: 36,
    fontWeight: "500",
    letterSpacing: -0.9,
    color: colors.title,
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
    color: colors.title,
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
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 14,
  },
  retryText: {
    color: colors.buttonOnPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  deckCard: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accentBorderStrong,
    backgroundColor: colors.accentFill,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
  },
  deckCopy: { flex: 1, minWidth: 0 },
  deckEyebrow: {
    color: colors.accentText,
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  deckTitle: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    marginTop: 5,
  },
  deckMeta: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 10,
    marginTop: 4,
  },
  deckArrow: {
    color: colors.accentText,
    fontFamily: fonts.displayMedium,
    fontSize: 23,
    marginLeft: 14,
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
    borderColor: colors.glassBorderRow,
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: {
    color: colors.title,
    fontSize: 16,
    lineHeight: 18,
  },
  plusDisabled: {
    opacity: 0.35,
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
  focusRail: {
    gap: 8,
    paddingBottom: 8,
  },
  focusCard: {
    width: 112,
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardFill,
    padding: 12,
  },
  focusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentFillMid,
    marginBottom: 9,
  },
  focusTitle: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 12,
  },
  focusPeriod: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 8,
    marginTop: 3,
    textTransform: "uppercase",
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
    color: colors.title,
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
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.title,
    backgroundColor: colors.overlaySoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  navN: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 16,
  },
  profileTriggerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  });
}
