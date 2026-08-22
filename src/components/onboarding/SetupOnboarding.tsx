import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@clerk/expo";
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
} from "react-native-reanimated";
import { fonts, type as typography, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";
import { WizardBackdrop } from "../ui/WizardBackdrop";
import { ChiRhoMark } from "../ui/ChiRhoMark";
import {
  addLovedOne,
  createGroup,
  previewGroupContent,
  regenerateGroupBackground,
  saveLovedOneConfig,
  selectDashboardBackground,
  selectGroupBackground,
  uploadGroupBackground,
  uploadLovedOnePhoto,
} from "../../lib/api";
import { DEFAULT_DASHBOARD_BACKGROUND } from "../../lib/dashboardBackgrounds";
import {
  remainingSetupChapters,
  type SetupChapter,
} from "../../lib/setupOnboarding";
import { WallpaperCarousel, type WallpaperItem } from "../wallpaper";
import { useBackgroundLibrary } from "../../lib/backgroundLibrary";
import { images, resolveImageUri } from "../../lib/assets";
import {
  communityAllowsDailyPrayers,
  type HomeCommunity,
  type HomeData,
  type HomeProfile,
  type LovedOneGender,
  type LovedOneKind,
  type PersonalPlan,
} from "../../types/home";
import type { LovedOnePrayerConfiguration } from "../../lib/prayerConfig";
import type {
  GroupCreatePayload,
  GroupPreviewPayload,
} from "../../features/groups/types";
import { AddLovedOneModal } from "../home/AddLovedOneModal";
import { CreateGroupModal } from "../home/CreateGroupModal";
import { DailyPrayerDrawer } from "../home/DailyPrayerDrawer";

const CHAPTER_COPY: Record<
  SetupChapter,
  { title: string; detail: string; expect: string; action: string }
> = {
  background: {
    title: "Choose a home background",
    detail: "Swipe the scenes. The one in the center becomes your home.",
    expect: "Swipe to find a scene that feels like home. You can change this later.",
    action: "Choose a background",
  },
  group: {
    title: "Create a prayer group",
    detail: "A circle to share intentions and pray together.",
    expect:
      "Next you’ll choose the kind of group, give it a name, and we’ll draft a purpose and scripture. You can invite people after.",
    action: "Continue",
  },
  lovedOne: {
    title: "Add someone to pray for",
    detail: "A first name and M or F is enough. Daily prayers will follow.",
    expect:
      "A first name and M or F is enough. You can add a photo and choose what to pray for. Daily prayers will follow from what you pick.",
    action: "Continue",
  },
  prayer: {
    title: "Write your morning prayer",
    detail: "Choose when, and AI will write from who you hold.",
    expect:
      "You’ll pick who this prayer holds and whether it’s morning, evening, or both. We’ll write it from what you chose.",
    action: "Continue",
  },
};

type Phase = "overview" | "chapters" | "ready";

export function SetupOnboarding({
  firstName,
  home,
  community,
  plan,
  onRefresh,
  onFinished,
}: {
  firstName: string;
  home: HomeData;
  community: HomeCommunity | null;
  plan: PersonalPlan | null;
  onRefresh: () => Promise<void>;
  onFinished: () => Promise<void> | void;
}) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { getToken } = useAuth();
  const [phase, setPhase] = useState<Phase>("overview");
  const [chapters, setChapters] = useState<SetupChapter[]>(() =>
    remainingSetupChapters(home, community, plan),
  );
  const [index, setIndex] = useState(0);
  const [groupOpen, setGroupOpen] = useState(false);
  const [lovedOneOpen, setLovedOneOpen] = useState(false);
  const [prayerOpen, setPrayerOpen] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [savingLovedOne, setSavingLovedOne] = useState(false);
  const [savingWallpaper, setSavingWallpaper] = useState(false);
  const [selectedWallpaper, setSelectedWallpaper] =
    useState<WallpaperItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lovedOnes, setLovedOnes] = useState<HomeProfile["managedLovedOnes"]>(
    home.profile.managedLovedOnes,
  );
  const closingRef = useRef(false);
  const completingRef = useRef(false);

  useEffect(() => {
    setLovedOnes(home.profile.managedLovedOnes);
  }, [home.profile.managedLovedOnes]);

  const chapter = chapters[index] ?? null;
  const allowDailyPrayers = communityAllowsDailyPrayers(community, plan);

  // The bundled default leads, followed by whatever the admin library offers.
  const { backgrounds } = useBackgroundLibrary();
  const wallpapers = useMemo<WallpaperItem[]>(
    () => [
      {
        id: "default",
        title: "ChiRho",
        path: DEFAULT_DASHBOARD_BACKGROUND,
        // The bundled asset is a module ref both image APIs accept; only the
        // expo-image typing in assets.ts disagrees.
        image: images.intro as unknown as ImageSourcePropType,
      },
      ...backgrounds.map((background) => ({
        id: background.backgrounduuid,
        title: background.title,
        path: background.url,
        // The carousel uses a plain RN Image, so it needs the proxied URL.
        image: { uri: resolveImageUri(background.url) || background.url },
      })),
    ],
    [backgrounds],
  );

  const requireToken = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("Your session expired. Please sign in again.");
    return token;
  }, [getToken]);

  const closeWizards = useCallback(() => {
    setGroupOpen(false);
    setLovedOneOpen(false);
    setPrayerOpen(false);
  }, []);

  const goToChapter = useCallback(
    (nextIndex: number, nextChapters: SetupChapter[] = chapters) => {
      if (nextIndex >= nextChapters.length) {
        closeWizards();
        setPhase("ready");
        return;
      }
      setChapters(nextChapters);
      setIndex(nextIndex);
      setPhase("chapters");
      closeWizards();
    },
    [chapters, closeWizards],
  );

  const advance = useCallback(
    (createdLovedOne?: HomeProfile["managedLovedOnes"][number]) => {
      const nextLovedOnes = createdLovedOne
        ? lovedOnes.some((person) => person.id === createdLovedOne.id)
          ? lovedOnes
          : [...lovedOnes, createdLovedOne]
        : lovedOnes;
      if (createdLovedOne) setLovedOnes(nextLovedOnes);

      let nextChapters = chapters;
      if (nextLovedOnes.length === 0) {
        nextChapters = nextChapters.filter((item) => item !== "prayer");
      } else if (
        allowDailyPrayers &&
        !nextChapters.includes("prayer")
      ) {
        const insertAt = nextChapters.indexOf("lovedOne");
        nextChapters = [...nextChapters];
        nextChapters.splice(
          insertAt >= 0 ? insertAt + 1 : nextChapters.length,
          0,
          "prayer",
        );
      }
      goToChapter(index + 1, nextChapters);
    },
    [allowDailyPrayers, chapters, goToChapter, index, lovedOnes],
  );

  const openChapterDrawer = () => {
    if (!chapter || chapter === "background") return;
    setGroupOpen(chapter === "group");
    setLovedOneOpen(chapter === "lovedOne");
    setPrayerOpen(chapter === "prayer");
  };

  const handleSaveWallpaper = async () => {
    const path = selectedWallpaper?.path || DEFAULT_DASHBOARD_BACKGROUND;
    if (path === DEFAULT_DASHBOARD_BACKGROUND) {
      advance();
      return;
    }
    setSavingWallpaper(true);
    setError(null);
    try {
      const token = await requireToken();
      // Sends the library uuid so the server freezes a copy in the user's own
      // storage rather than pointing at art an admin can later replace.
      await selectDashboardBackground(path, [], token, {
        backgrounduuid: selectedWallpaper?.id,
        replace: true,
      });
      await onRefresh();
      advance();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save this background",
      );
    } finally {
      setSavingWallpaper(false);
    }
  };

  const skipChapter = () => {
    if (closingRef.current || completingRef.current) return;
    closingRef.current = true;
    closeWizards();
    advance();
    setTimeout(() => {
      closingRef.current = false;
    }, 500);
  };

  const handlePreviewGroup = async (input: GroupPreviewPayload) => {
    const token = await requireToken();
    return previewGroupContent(input, token);
  };

  const handleCreateGroup = async (input: GroupCreatePayload) => {
    setSavingGroup(true);
    setError(null);
    try {
      const token = await requireToken();
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
        // Group exists; background can be set later.
      }
      await onRefresh();
      setGroupOpen(false);
      advance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create this group");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleAddLovedOne = async (
    name: string,
    configurations: LovedOnePrayerConfiguration[],
    photoDataUris: string[] = [],
    gender: LovedOneGender | null,
    kind: LovedOneKind = "person",
  ) => {
    setSavingLovedOne(true);
    setError(null);
    try {
      const token = await requireToken();
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
      const created = {
        id: lovedOne.id,
        firstName: lovedOne.firstName,
        gender: lovedOne.gender,
        kind: lovedOne.kind || kind,
        hasConfig: configurations.length > 0,
        categories: configurations.map((item) => item.category),
      };
      setLovedOneOpen(false);
      await onRefresh();
      advance(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add loved one");
    } finally {
      setSavingLovedOne(false);
    }
  };

  const finish = async () => {
    await onFinished();
  };

  const host = useMemo(() => {
    if (phase === "ready") {
      return {
        eyebrow: "READY",
        title: "Your home is waiting",
        subtitle:
          "Groups, loved ones, and daily prayer live here. You can change any of this later.",
      };
    }
    if (phase === "chapters" && chapter) {
      const copy = CHAPTER_COPY[chapter];
      return {
        eyebrow: `${index + 1} OF ${chapters.length}`,
        title: copy.title,
        subtitle: copy.expect,
      };
    }
    return {
      eyebrow: "YOUR PRAYER LIFE",
      title: firstName !== "friend" ? `${firstName}, begin here` : "Begin here",
      subtitle: "A few quiet steps. You can skip any of them.",
    };
  }, [chapter, chapters.length, firstName, index, phase]);

  if (phase === "chapters" && chapter === "background") {
    return (
      <View style={styles.root}>
        <WallpaperCarousel
          data={wallpapers}
          subtitle="Swipe to choose a background"
          onIndexChange={(_next, item) => setSelectedWallpaper(item)}
          bottomInset={120 + insets.bottom}
          footer={
            <View
              style={[
                styles.wallpaperActions,
                { paddingBottom: 16 + insets.bottom },
              ]}
            >
              {error ? <Text style={styles.wallpaperError}>{error}</Text> : null}
              <Pressable
                disabled={savingWallpaper}
                onPress={() => void handleSaveWallpaper()}
                style={[styles.submit, styles.wallpaperSubmit]}
              >
                <Text style={styles.submitText}>
                  {savingWallpaper ? "Saving…" : "Use this background"}
                </Text>
              </Pressable>
              <Pressable
                disabled={savingWallpaper}
                onPress={skipChapter}
                style={styles.skip}
              >
                <Text style={styles.skipText}>Keep the default</Text>
              </Pressable>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <WizardBackdrop />
      <View
        pointerEvents="none"
        style={[styles.watermark, { top: insets.top + 16 }]}
      >
        <ChiRhoMark width={76} height={101} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.handleWrap, { top: insets.top + 8 }]}
      >
        <View style={styles.handle} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: 56 + insets.top, paddingBottom: 32 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          key={`${phase}-${chapter ?? "overview"}`}
          entering={FadeInDown.duration(700)
            .easing(Easing.bezier(0.22, 1, 0.36, 1))
            .withInitialValues({
              opacity: 0,
              transform: [{ translateY: 18 }],
            })
            .reduceMotion(ReduceMotion.System)}
        >
          <Text style={styles.eyebrow}>{host.eyebrow}</Text>
          <View style={styles.dots}>
            {chapters.map((item, dotIndex) => {
              const reached =
                phase === "ready" || (phase === "chapters" && dotIndex <= index);
              const active = phase === "chapters" && item === chapter;
              return (
                <View
                  key={item}
                  style={[
                    styles.dot,
                    reached && styles.dotReached,
                    active && styles.dotActive,
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.title}>{host.title}</Text>
          <Text style={styles.subtitle}>{host.subtitle}</Text>

          {phase === "overview" ? (
            <View style={styles.rows}>
              {chapters.map((item) => (
                <View key={item} style={styles.row}>
                  <View style={styles.bullet} />
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{CHAPTER_COPY[item].title}</Text>
                    <Text style={styles.rowDetail}>{CHAPTER_COPY[item].detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {phase === "overview" ? (
            <Pressable
              onPress={() => goToChapter(0)}
              style={styles.submit}
            >
              <Text style={styles.submitText}>Let’s begin</Text>
            </Pressable>
          ) : null}

          {phase === "ready" ? (
            <Pressable onPress={() => void finish()} style={styles.submit}>
              <Text style={styles.submitText}>Enter ChiRho</Text>
            </Pressable>
          ) : null}

          {phase === "overview" ? (
            <Pressable onPress={() => void finish()} style={styles.skip}>
              <Text style={styles.skipText}>I’ll explore on my own</Text>
            </Pressable>
          ) : null}

          {phase === "chapters" && chapter ? (
            <>
              <Pressable
                onPress={openChapterDrawer}
                style={styles.submit}
              >
                <Text style={styles.submitText}>{CHAPTER_COPY[chapter].action}</Text>
              </Pressable>
              <Pressable onPress={skipChapter} style={styles.skip}>
                <Text style={styles.skipText}>Skip this step</Text>
              </Pressable>
            </>
          ) : null}
        </Animated.View>
      </ScrollView>

      <CreateGroupModal
        visible={groupOpen}
        saving={savingGroup}
        error={groupOpen ? error : null}
        dismissLabel="Skip"
        onClose={skipChapter}
        onGeneratePreview={handlePreviewGroup}
        onSubmit={handleCreateGroup}
      />
      <AddLovedOneModal
        visible={lovedOneOpen}
        saving={savingLovedOne}
        error={lovedOneOpen ? error : null}
        dismissLabel="Skip"
        onClose={skipChapter}
        onSubmit={handleAddLovedOne}
      />
      <DailyPrayerDrawer
        visible={prayerOpen}
        lovedOnes={lovedOnes}
        dismissLabel="Skip"
        preselectLovedOnes
        onClose={() => {
          if (completingRef.current) {
            completingRef.current = false;
            setPrayerOpen(false);
            return;
          }
          skipChapter();
        }}
        onComplete={async () => {
          completingRef.current = true;
          await onRefresh();
          closeWizards();
          advance();
        }}
      />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    watermark: {
      position: "absolute",
      right: 20,
      zIndex: 2,
      opacity: 0.14,
    },
    scroll: { flex: 1 },
    content: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    handleWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 2,
      alignItems: "center",
    },
    handle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.glassBorderStrong,
    },
    eyebrow: {
      ...typography.labelSm,
      color: colors.muted,
      marginBottom: 10,
    },
    dots: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 12,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.glassBorderStrong,
    },
    dotReached: { backgroundColor: colors.accent },
    dotActive: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    title: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 27,
      marginBottom: 3,
    },
    subtitle: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 16,
      marginBottom: 24,
    },
    rows: { gap: 16, marginBottom: 8 },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    bullet: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.muted,
      marginTop: 6,
    },
    rowCopy: { flex: 1, minWidth: 0 },
    rowTitle: {
      color: colors.title,
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
    },
    rowDetail: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },
    submit: {
      minHeight: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.buttonPrimary,
      marginTop: 24,
    },
    submitText: {
      color: colors.buttonOnPrimary,
      fontFamily: fonts.displayMedium,
      fontSize: 14,
    },
    skip: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    skipText: {
      color: colors.accentText,
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
    },
    wallpaperActions: {
      paddingHorizontal: 24,
    },
    wallpaperSubmit: {
      marginTop: 0,
    },
    wallpaperError: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 12,
      textAlign: "center",
      marginBottom: 12,
    },
  });
}
