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
import {
  DEFAULT_BACKGROUND_MUSIC,
  FALLBACK_PRAYER_IMAGE,
  privateImageCachePolicy,
  resolveImage,
} from "../../lib/assets";
import { parseAppearance } from "../../lib/appearancePreference";
import { selectedDashboardBackgrounds } from "../../lib/dashboardBackgrounds";
import {
  cachedBackgroundUrls,
  useBackgroundLibrary,
} from "../../lib/backgroundLibrary";
import {
  setBackgroundMusicEnabled,
  setBackgroundMusicUrl,
} from "../../lib/backgroundMusicPreference";
import { useMusicLibrary, resolveLibraryMusicUrl } from "../../lib/musicLibrary";
import {
  addLovedOne,
  createGroup,
  createPrayerFocus,
  generateLovedOnePrayer,
  generatePrayerFocusPrayer,
  generatePrayerCardAudio,
  getLovedOnePhotos,
  getMobileHome,
  previewGroupContent,
  regenerateGroupBackground,
  saveLovedOneConfig,
  selectGroupBackground,
  uploadGroupBackground,
  uploadLovedOnePhoto,
  uploadPrayerFocusPhoto,
  updatePersonalPlan,
  updatePrayerFocus,
} from "../../lib/api";
import {
  acceptGroupInvitation,
  declineGroupInvitation,
} from "../../lib/groupInviteApi";
import type { LovedOnePrayerConfiguration } from "../../lib/prayerConfig";
import type {
  GroupCreatePayload,
  GroupPreviewPayload,
} from "../../features/groups/types";
import { GridOverlay } from "../ui/GridOverlay";
import { PrayerCard } from "../ui/PrayerCard";
import { LovedOne } from "../ui/LovedOne";
import { KenBurnsImage, lovedOneImagePaths } from "../ui/KenBurnsImage";
import { LoadingChiRhoOverlay } from "../ui/LoadingChiRhoOverlay";
import {
  hasExistingSetupData,
  isSetupOnboardingComplete,
  markSetupOnboardingComplete,
  remainingSetupChapters,
} from "../../lib/setupOnboarding";
import { focusPhotoPath } from "../../lib/prayerFocusImage";
import { SetupOnboarding } from "../onboarding/SetupOnboarding";
import { AddLovedOneModal } from "./AddLovedOneModal";
import { AddSubjectSheet, type AddSubjectChoice } from "./AddSubjectSheet";
import { PrayerFocusCircle } from "./PrayerFocusCircle";
import { HomeNavFab, HOME_NAV_FAB_RESERVE } from "./HomeNavFab";
import {
  NeedPrayerDrawer,
  type NeedPrayerMode,
} from "./NeedPrayerDrawer";
import { CreateGroupModal } from "./CreateGroupModal";
import { LovedOnePhotosModal } from "./LovedOnePhotosModal";
import { PrayerDetailModal } from "./PrayerDetailModal";
import {
  PrayerFocusModal,
  type PrayerFocusIntent,
} from "./PrayerFocusModal";
import { PersonalPlanDrawer } from "./PersonalPlanDrawer";
import { ProfileDrawer } from "./ProfileDrawer";
import type {
  HomeData,
  HomeLovedOne,
  HomePrayerCard,
  LovedOneGender,
  LovedOneKind,
  MobileHomeResponse,
  PendingGroupInvite,
  PrayerFocus,
  PrayerFocusInput,
} from "../../types/home";
import {
  communityAllowsPersonalPrayer,
  formatTrialRemaining,
} from "../../types/home";

async function prefetchHomeImages(result: MobileHomeResponse, token: string) {
  const paths = [
    ...selectedDashboardBackgrounds(
      result.community?.backgroundImage,
      result.home.profile.dashboardBackgrounds,
      cachedBackgroundUrls(),
    ),
    ...result.home.cards.slice(0, 2).map((card) => card.image),
    ...result.home.lovedOnes
      .slice(0, 5)
      .flatMap((person) => lovedOneImagePaths(person)),
    ...result.home.groups.slice(0, 3).map((group) => group.image),
  ].filter(
    (path): path is string => typeof path === "string" && path.length > 0,
  );
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
        path: string;
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

type PraySubject =
  | { kind: "person"; label: string; person: HomeLovedOne }
  | { kind: "focus"; label: string; focus: PrayerFocus };

/** People and things share one rail, ordered by name regardless of type. */
function praySubjects(
  lovedOnes: HomeLovedOne[],
  focuses: PrayerFocus[],
): PraySubject[] {
  const subjects: PraySubject[] = [
    ...lovedOnes.map((person) => ({
      kind: "person" as const,
      label: person.name,
      person,
    })),
    ...focuses.map((focus) => ({
      kind: "focus" as const,
      label: focus.title,
      focus,
    })),
  ];
  return subjects.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
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
  const { urls: libraryUrls } = useBackgroundLibrary();
  const { tracks: musicTracks } = useMusicLibrary();
  const getTokenRef = useRef(getToken);
  const prayRailRef = useRef<ScrollView>(null);
  const prayRailHint = useRef(0);
  const { user } = useUser();
  const firstName = user?.firstName || "friend";
  const [response, setResponse] = useState<MobileHomeResponse | null>(null);
  const responseRef = useRef<MobileHomeResponse | null>(null);
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
  const [editingLovedOne, setEditingLovedOne] = useState<{
    id: string;
    name: string;
    configurations: LovedOnePrayerConfiguration[];
    kind?: LovedOneKind;
  } | null>(null);
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [addLovedOneIntent, setAddLovedOneIntent] =
    useState<LovedOneKind>("person");
  const [focusIntent, setFocusIntent] = useState<PrayerFocusIntent>("thing");
  const [needPrayerOpen, setNeedPrayerOpen] = useState(false);
  const [needPrayerMode, setNeedPrayerMode] = useState<NeedPrayerMode>("prayer");
  const [photoLovedOne, setPhotoLovedOne] = useState<{
    id: string;
    firstName: string;
  } | null>(null);
  const pendingPhotoLovedOneRef = useRef<{
    id: string;
    firstName: string;
  } | null>(null);
  const pendingSubjectRef = useRef<AddSubjectChoice | null>(null);
  const pendingLovedOnePrayerRef = useRef<HomeLovedOne | null>(null);
  const pendingPrayerRef = useRef<
    | { kind: "focus"; focus: PrayerFocus }
    | { kind: "card"; card: HomePrayerCard }
    | null
  >(null);
  const photoModalFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [prayerFocusOpen, setPrayerFocusOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<PrayerFocus | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [planPending, setPlanPending] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [, setTrialTick] = useState(0);
  const [savingLovedOne, setSavingLovedOne] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [inviteBusyToken, setInviteBusyToken] = useState<string | null>(null);
  const [setupReady, setSetupReady] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const generatingLovedOneRef = useRef(false);
  const showPersonalPrayer = communityAllowsPersonalPrayer(
    response?.community,
    response?.plan,
  );
  const trialLabel = response?.plan?.billingEnabled
    ? formatTrialRemaining(response.plan.trialEndsAt)
    : null;

  useEffect(() => {
    if (response?.plan?.status !== "trial") return;
    const id = setInterval(() => setTrialTick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [response?.plan?.status]);

  useEffect(() => {
    if (!__DEV__) return;
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

  const openQueuedProfileAction = useCallback(() => {
    openQueuedPhotoModal();
  }, [openQueuedPhotoModal]);

  const openQueuedSubjectModal = useCallback(() => {
    const choice = pendingSubjectRef.current;
    if (!choice) return;
    pendingSubjectRef.current = null;
    setMutationError(null);
    if (choice === "person" || choice === "family") {
      setEditingLovedOne(null);
      setAddLovedOneIntent(choice);
      setAddLovedOneOpen(true);
      return;
    }
    if (choice === "situation") {
      setNeedPrayerMode("situation");
      setNeedPrayerOpen(true);
      return;
    }
    setSelectedFocus(null);
    setFocusIntent("thing");
    setPrayerFocusOpen(true);
  }, []);

  const handleAddSubject = useCallback(
    (choice: AddSubjectChoice) => {
      // The next drawer can only present once this sheet is fully dismissed.
      pendingSubjectRef.current = choice;
      setAddSubjectOpen(false);
      if (Platform.OS !== "ios") openQueuedSubjectModal();
    },
    [openQueuedSubjectModal],
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
        if (__DEV__) {
          console.info("[HomeFeatures] home payload", {
            hasCommunity: Boolean(result.community),
            licenseTier: result.community?.licenseTier ?? null,
            allowPersonalPrayer: communityAllowsPersonalPrayer(
              result.community,
              result.plan,
            ),
            planStatus: result.plan?.status ?? null,
          });
        }
        responseRef.current = result;
        setResponse(result);
        if (refresh) {
          const count = praySubjects(
            result.home.lovedOnes || [],
            result.home.prayerFocuses || [],
          ).length;
          if (count > 5) {
            const hint = ++prayRailHint.current;
            requestAnimationFrame(() => {
              setTimeout(() => {
                if (hint !== prayRailHint.current) return;
                prayRailRef.current?.scrollTo({ x: 52, animated: true });
                setTimeout(() => {
                  if (hint !== prayRailHint.current) return;
                  prayRailRef.current?.scrollTo({ x: 0, animated: true });
                }, 700);
              }, 160);
            });
          }
        }
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

  const respondToInvite = useCallback(
    async (invite: PendingGroupInvite, action: "accept" | "deny") => {
      if (inviteBusyToken) return;
      setInviteBusyToken(invite.invitationToken);
      try {
        const token = await requireCurrentToken();
        if (action === "accept") {
          await acceptGroupInvitation(invite.invitationToken, token);
          router.push({
            pathname: "/(app)/groups/[groupuuid]",
            params: { groupuuid: invite.groupuuid },
          });
        } else {
          await declineGroupInvitation(invite.invitationToken, token);
        }
        await loadHome(true);
      } catch (err) {
        Alert.alert(
          action === "accept" ? "Unable to join" : "Unable to decline",
          err instanceof Error ? err.message : "Please try again.",
        );
      } finally {
        setInviteBusyToken(null);
      }
    },
    [inviteBusyToken, loadHome, requireCurrentToken, router],
  );

  const home: HomeData | null = response?.home || null;

  useEffect(() => {
    if (setupReady || loading) return;
    if (error && !home) {
      setSetupReady(true);
      return;
    }
    if (!home || !user?.id) return;
    let cancelled = false;
    void (async () => {
      const completed = await isSetupOnboardingComplete(user.id);
      if (cancelled) return;
      const hasData = hasExistingSetupData(home);
      if (hasData && !completed) {
        void markSetupOnboardingComplete(user.id);
      }
      const chapters = hasData
        ? []
        : remainingSetupChapters(
            home,
            response?.community ?? null,
            response?.plan ?? null,
          );
      setSetupOpen(!completed && !hasData && chapters.length > 0);
      setSetupReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [error, home, loading, response?.community, response?.plan, setupReady, user?.id]);

  useEffect(() => {
    if (typeof home?.profile.backgroundMusicEnabled !== "boolean") return;
    setBackgroundMusicEnabled(home.profile.backgroundMusicEnabled);
  }, [home?.profile.backgroundMusicEnabled]);

  useEffect(() => {
    setBackgroundMusicUrl(
      resolveLibraryMusicUrl(home?.profile.backgroundMusicId, musicTracks) ||
        DEFAULT_BACKGROUND_MUSIC,
    );
  }, [home?.profile.backgroundMusicId, musicTracks]);

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
  // Anyone who has not picked their own rotates the live library, so admin
  // edits reach them without an app release.
  const dashboardBackgrounds = selectedDashboardBackgrounds(
    response?.community?.backgroundImage,
    home?.profile.dashboardBackgrounds,
    libraryUrls,
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
    const backgroundImage = images[0] || FALLBACK_PRAYER_IMAGE;
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

  const handleAddLovedOneDismiss = () => {
    const person = pendingLovedOnePrayerRef.current;
    if (person) {
      pendingLovedOnePrayerRef.current = null;
      void handleLovedOnePress(person);
      return;
    }
    setAddLovedOneIntent("person");
    openQueuedPhotoModal();
  };

  // Tapping a familiar face in the add flow means "I already did this" — close
  // the wizard and pray for them instead of adding a duplicate.
  const handleSelectExistingLovedOne = (person: HomeLovedOne) => {
    pendingLovedOnePrayerRef.current = person;
    setAddLovedOneOpen(false);
    if (Platform.OS !== "ios") handleAddLovedOneDismiss();
  };

  const handleSelectExistingFocus = (
    focus: PrayerFocus,
    source: "thing" | "situation",
  ) => {
    pendingPrayerRef.current = { kind: "focus", focus };
    if (source === "thing") {
      setPrayerFocusOpen(false);
      setSelectedFocus(null);
    } else {
      setNeedPrayerOpen(false);
    }
    if (Platform.OS !== "ios") handlePendingPrayerDismiss();
  };

  const handlePrayerFocusPress = async (focus: PrayerFocus) => {
    if (generatingLovedOneRef.current) return;
    generatingLovedOneRef.current = true;
    const photoPath = focusPhotoPath(focus);
    const images = photoPath ? [photoPath] : [];
    const backgroundImage = photoPath || FALLBACK_PRAYER_IMAGE;
    const timeOfDayLabel =
      new Date().getHours() < 12 ? "Morning Prayer" : "Evening Prayer";
    setSelectedCard({
      title: focus.title,
      verse: timeOfDayLabel,
      text: `Preparing a prayer for ${focus.title}...`,
      image: backgroundImage,
      images,
    });
    setPrayerLoading(true);
    try {
      const token = await requireCurrentToken();
      const prayer = await generatePrayerFocusPrayer(
        focus.focusuuid,
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
        title: focus.title,
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

  const handlePendingPrayerDismiss = () => {
    const pending = pendingPrayerRef.current;
    if (!pending) return;
    pendingPrayerRef.current = null;
    if (pending.kind === "focus") {
      void handlePrayerFocusPress(pending.focus);
      return;
    }
    setDetailNavigationDirection(1);
    setSelectedCard(pending.card);
  };

  const handleAddLovedOne = async (
    name: string,
    configurations: LovedOnePrayerConfiguration[],
    photoDataUris: string[] = [],
    gender: LovedOneGender | null,
    kind: LovedOneKind = "person",
  ) => {
    setSavingLovedOne(true);
    setMutationError(null);
    try {
      const token = await requireCurrentToken();
      const lovedOne = await addLovedOne(
        name,
        token,
        gender ?? undefined,
        kind,
      );
      if (configurations.length) {
        await saveLovedOneConfig(lovedOne.id, configurations, token);
      }
      for (const imageData of photoDataUris) {
        await uploadLovedOnePhoto(lovedOne.id, imageData, token);
      }
      await loadHome(true);
      pendingLovedOnePrayerRef.current =
        responseRef.current?.home.lovedOnes.find(
          (person) => person.id === lovedOne.id,
        ) || {
          id: lovedOne.id,
          name: lovedOne.firstName,
          avatar: "",
          intention: "",
          gender: lovedOne.gender,
          kind: lovedOne.kind || kind,
          configurations,
        };
      setAddLovedOneOpen(false);
      setEditingLovedOne(null);
      if (Platform.OS !== "ios") handleAddLovedOneDismiss();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Unable to add loved one");
    } finally {
      setSavingLovedOne(false);
    }
  };

  const handleUpdateLovedOneReasons = async (
    id: string,
    configurations: LovedOnePrayerConfiguration[],
  ) => {
    setSavingLovedOne(true);
    setMutationError(null);
    try {
      const token = await requireCurrentToken();
      await saveLovedOneConfig(id, configurations, token);
      await loadHome(true);
      setAddLovedOneOpen(false);
      setEditingLovedOne(null);
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : "Unable to update prayer reasons",
      );
    } finally {
      setSavingLovedOne(false);
    }
  };

  const handlePreviewGroup = async (input: GroupPreviewPayload) => {
    const token = await requireCurrentToken();
    return previewGroupContent(input, token);
  };

  const handleCreateGroup = async (input: GroupCreatePayload) => {
    setSavingGroup(true);
    setMutationError(null);
    try {
      const token = await requireCurrentToken();
      const group = await createGroup(input, token);
      try {
        for (const imageUrl of input.backgroundUrls || []) {
          await selectGroupBackground(group.groupuuid, imageUrl, token);
        }
        for (const imageData of input.backgroundUploads || []) {
          await uploadGroupBackground(group.groupuuid, imageData, token);
        }
        if (input.generateBackground) {
          await regenerateGroupBackground(group.groupuuid, token);
        }
      } catch {
        // Group exists; background can be set later in group settings.
      }
      await loadHome(true);
      setCreateGroupOpen(false);
      setProfileOpen(false);
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

  const openPersonalPlan = () => {
    setPlanError(null);
    setProfileOpen(false);
    setPlanOpen(true);
  };

  const handlePersonalPlan = async (
    action: "start_trial" | "subscribe_placeholder",
  ) => {
    setPlanPending(true);
    setPlanError(null);
    try {
      const token = await requireCurrentToken();
      await updatePersonalPlan(action, token);
      await loadHome(true);
      setPlanOpen(false);
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : "Unable to update ChiRho Personal",
      );
    } finally {
      setPlanPending(false);
    }
  };

  const handleSaveSituation = async (situation: {
    title: string;
    burdenId: string;
    optionId: string;
  }) => {
    const token = await requireCurrentToken();
    const created = await createPrayerFocus(
      {
        title: situation.title,
        type: "situation",
        species: null,
        gender: null,
        note: null,
        categories: [situation.burdenId],
        virtues: ["peace", "grace"],
        period: "both",
        active: true,
        order:
          Math.max(
            -1,
            ...(home?.prayerFocuses.map((focus) => focus.order) || []),
          ) + 1,
      },
      token,
    );
    await loadHome(true);
    pendingPrayerRef.current = {
      kind: "focus",
      focus:
        responseRef.current?.home.prayerFocuses.find(
          (focus) => focus.focusuuid === created.focusuuid,
        ) || created,
    };
    setNeedPrayerOpen(false);
    if (Platform.OS !== "ios") handlePendingPrayerDismiss();
  };

  const handleSavePrayerFocus = async (
    input: PrayerFocusInput,
    newPhotos: string[] = [],
  ) => {
    setSavingLovedOne(true);
    setMutationError(null);
    try {
      const token = await requireCurrentToken();
      let createdFocus: PrayerFocus | null = null;
      if (selectedFocus) {
        await updatePrayerFocus(selectedFocus.focusuuid, input, token);
      } else {
        const created = await createPrayerFocus(input, token);
        createdFocus = created;
        for (const imageData of newPhotos) {
          await uploadPrayerFocusPhoto(created.focusuuid, imageData, token);
        }
      }
      await loadHome(true);
      if (createdFocus) {
        pendingPrayerRef.current = {
          kind: "focus",
          focus:
            responseRef.current?.home.prayerFocuses.find(
              (focus) => focus.focusuuid === createdFocus.focusuuid,
            ) || createdFocus,
        };
      }
      setPrayerFocusOpen(false);
      setSelectedFocus(null);
      if (createdFocus && Platform.OS !== "ios") {
        handlePendingPrayerDismiss();
      }
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : "Unable to save prayer focus",
      );
    } finally {
      setSavingLovedOne(false);
    }
  };

  if (loading || (!error && !setupReady)) {
    return (
      <View style={styles.root}>
        <LoadingChiRhoOverlay
          label="Gathering your prayers…"
          visible
        />
      </View>
    );
  }

  if (setupOpen && home) {
    return (
      <SetupOnboarding
        firstName={firstName}
        home={home}
        community={response?.community ?? null}
        plan={response?.plan ?? null}
        onRefresh={() => loadHome(true)}
        onFinished={async () => {
          if (user?.id) await markSetupOnboardingComplete(user.id);
          await loadHome(true);
          setSetupOpen(false);
        }}
      />
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
          { paddingTop: insets.top + 24, paddingBottom: HOME_NAV_FAB_RESERVE + insets.bottom },
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
            {trialLabel ? (
              <Pressable
                accessibilityLabel={trialLabel}
                accessibilityRole="button"
                onPress={openPersonalPlan}
              >
                <Text style={styles.trialCaption}>{trialLabel}</Text>
              </Pressable>
            ) : null}
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
            {!showPersonalPrayer && !response?.community ? (
              <Pressable
                accessibilityLabel="Unlock ChiRho Personal"
                accessibilityRole="button"
                onPress={openPersonalPlan}
                style={({ pressed }) => [
                  styles.deckCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.deckCopy}>
                  <Text style={styles.deckEyebrow}>CHIRHO PERSONAL</Text>
                  <Text style={styles.deckTitle}>Keep your prayer cards</Text>
                  <Text style={styles.deckMeta}>
                    {response?.plan?.canStartTrial
                      ? "Start a free week, or continue on your own"
                      : `Continue with Pro · ${response?.plan?.priceLabel || "$4.99/mo"}`}
                  </Text>
                </View>
                <Text style={styles.deckArrow}>›</Text>
              </Pressable>
            ) : null}
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

            <Text style={styles.section}>Pray For</Text>
            <ScrollView
              ref={prayRailRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.lovedRail}
            >
              {praySubjects(home?.lovedOnes || [], home.prayerFocuses).map(
                (subject) =>
                  subject.kind === "person" ? (
                    <LovedOne
                      key={subject.person.id}
                      person={subject.person}
                      compact
                      showIntention={false}
                      onPress={() => handleLovedOnePress(subject.person)}
                      onLongPress={() => {
                        setMutationError(null);
                        setEditingLovedOne({
                          id: subject.person.id,
                          name: subject.person.name,
                          configurations: subject.person.configurations || [],
                          kind: subject.person.kind,
                        });
                        setAddLovedOneIntent(
                          subject.person.kind === "family" ? "family" : "person",
                        );
                        setAddLovedOneOpen(true);
                      }}
                    />
                  ) : (
                    <PrayerFocusCircle
                      key={subject.focus.focusuuid}
                      focus={subject.focus}
                      photoPath={focusPhotoPath(subject.focus)}
                      onLongPress={() => {
                        setMutationError(null);
                        setSelectedFocus(subject.focus);
                        setPrayerFocusOpen(true);
                      }}
                      onPress={() => handlePrayerFocusPress(subject.focus)}
                    />
                  ),
              )}
            </ScrollView>
              </>
            ) : null}

            {response?.pendingInvites?.length ? (
              <View style={styles.inviteStack}>
                {response.pendingInvites.map((invite) => {
                  const busy = inviteBusyToken === invite.invitationToken;
                  return (
                    <View key={invite.invitationToken} style={styles.inviteCard}>
                      <Text style={styles.inviteLabel}>GROUP REQUEST</Text>
                      <Text style={styles.inviteTitle}>{invite.groupName}</Text>
                      <Text style={styles.inviteHint}>
                        {invite.phoneLastFour
                          ? `Sent to the number ending in ${invite.phoneLastFour}. Accept or decline.`
                          : "Accept or decline this group invitation."}
                      </Text>
                      <View style={styles.inviteActions}>
                        <Pressable
                          accessibilityRole="button"
                          disabled={busy}
                          onPress={() => respondToInvite(invite, "deny")}
                          style={({ pressed }) => [
                            styles.inviteDeny,
                            pressed && styles.pressed,
                            busy && styles.plusDisabled,
                          ]}
                        >
                          <Text style={styles.inviteDenyText}>Decline</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          disabled={busy}
                          onPress={() => respondToInvite(invite, "accept")}
                          style={({ pressed }) => [
                            styles.inviteAccept,
                            pressed && styles.pressed,
                            busy && styles.plusDisabled,
                          ]}
                        >
                          <Text style={styles.inviteAcceptText}>
                            {busy ? "Please wait…" : "Accept"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.section}>Prayer Groups</Text>
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

      <HomeNavFab
        bottom={insets.bottom + 4}
        onPress={() => setAddSubjectOpen(true)}
      />

      <NeedPrayerDrawer
        visible={needPrayerOpen}
        mode={needPrayerMode}
        existingSituations={(home?.prayerFocuses || []).filter(
          (focus) => focus.type === "situation",
        )}
        onSelectExisting={(focus) =>
          handleSelectExistingFocus(focus, "situation")
        }
        onSaveSituation={handleSaveSituation}
        traditionId={home?.profile.traditions.selected || "scripture"}
        traditionLabel={
          home?.profile.traditions.options.find(
            (option) => option.id === home.profile.traditions.selected,
          )?.label || "Just Scripture"
        }
        onClose={() => setNeedPrayerOpen(false)}
        onDismiss={handlePendingPrayerDismiss}
        onGenerated={(card) => {
          pendingPrayerRef.current = { kind: "card", card };
          setNeedPrayerOpen(false);
          if (Platform.OS !== "ios") handlePendingPrayerDismiss();
          void loadHome(true);
        }}
      />

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
        existingLovedOnes={(home?.lovedOnes || []).filter((person) =>
          addLovedOneIntent === "family"
            ? person.kind === "family"
            : person.kind !== "family",
        )}
        editing={editingLovedOne}
        intent={addLovedOneIntent}
        onSelectExisting={handleSelectExistingLovedOne}
        onClose={() => {
          setAddLovedOneOpen(false);
          setEditingLovedOne(null);
          setAddLovedOneIntent("person");
        }}
        onDismiss={handleAddLovedOneDismiss}
        onSubmit={handleAddLovedOne}
        onUpdate={handleUpdateLovedOneReasons}
      />
      <LovedOnePhotosModal
        visible={photoLovedOne !== null}
        lovedOne={photoLovedOne}
        onClose={() => setPhotoLovedOne(null)}
        onChanged={() => loadHome(true)}
      />
      <PersonalPlanDrawer
        visible={planOpen}
        plan={response?.plan || null}
        pending={planPending}
        error={planError}
        onClose={() => setPlanOpen(false)}
        onStartTrial={() => handlePersonalPlan("start_trial")}
        onSubscribePlaceholder={() =>
          handlePersonalPlan("subscribe_placeholder")
        }
      />
      <PrayerFocusModal
        visible={prayerFocusOpen}
        focus={selectedFocus}
        saving={savingLovedOne}
        error={mutationError}
        intent={focusIntent}
        existingFocuses={(home?.prayerFocuses || []).filter(
          (focus) => focus.type !== "situation",
        )}
        nextOrder={
          Math.max(-1, ...(home?.prayerFocuses.map((focus) => focus.order) || [])) +
          1
        }
        onClose={() => {
          setPrayerFocusOpen(false);
          setSelectedFocus(null);
        }}
        onDismiss={handlePendingPrayerDismiss}
        onSelectExisting={(focus) => handleSelectExistingFocus(focus, "thing")}
        onSubmit={handleSavePrayerFocus}
      />
      <AddSubjectSheet
        visible={addSubjectOpen}
        onClose={() => setAddSubjectOpen(false)}
        onDismiss={openQueuedSubjectModal}
        onSelect={handleAddSubject}
      />
      <ProfileDrawer
        visible={profileOpen}
        profile={home?.profile || null}
        lovedOnes={home?.lovedOnes || []}
        prayerFocuses={home?.prayerFocuses || []}
        groups={home?.groups || []}
        community={response?.community || null}
        plan={response?.plan || null}
        onClose={() => {
          setCreateGroupOpen(false);
          setProfileOpen(false);
        }}
        onDismiss={openQueuedProfileAction}
        onChanged={() => loadHome(true)}
        onOpenPlan={openPersonalPlan}
        onBecameIndependent={openPersonalPlan}
        onCreateGroup={() => {
          setMutationError(null);
          setCreateGroupOpen(true);
        }}
      >
        <CreateGroupModal
          visible={createGroupOpen}
          saving={savingGroup}
          error={createGroupOpen ? mutationError : null}
          onClose={() => setCreateGroupOpen(false)}
          onGeneratePreview={handlePreviewGroup}
          onSubmit={handleCreateGroup}
        />
      </ProfileDrawer>
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
  trialCaption: {
    color: colors.accentText,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.3,
    marginTop: 6,
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
  plusDisabled: {
    opacity: 0.35,
  },
  inviteStack: {
    gap: 10,
    marginBottom: 8,
  },
  inviteCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentBorderMuted,
    backgroundColor: colors.accentFillMuted,
    gap: 6,
  },
  inviteLabel: {
    color: colors.accentText,
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 0.7,
  },
  inviteTitle: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  inviteHint: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  inviteActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  inviteDeny: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteDenyText: {
    color: colors.mutedStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  inviteAccept: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: colors.buttonPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteAcceptText: {
    color: colors.buttonOnPrimary,
    fontFamily: fonts.displayMedium,
    fontSize: 12,
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
    flexGrow: 0,
    justifyContent: "flex-start",
    gap: 4,
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
    borderColor: colors.cardBorder,
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  });
}
