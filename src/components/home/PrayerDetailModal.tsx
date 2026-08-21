import { useEffect, useRef, useState } from "react";
import {
  getBackgroundMusicEnabled,
  subscribeBackgroundMusicEnabled,
} from "../../lib/backgroundMusicPreference";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import {
  API_BASE,
  DEFAULT_BACKGROUND_MUSIC,
  resolveAudioUrl,
} from "../../lib/assets";
import { publishPrayerCard, trackPrayerShare } from "../../lib/api";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import type { HomePrayerCard } from "../../types/home";
import { KenBurnsImage } from "../ui/KenBurnsImage";
import { SwipeChevron } from "../ui/SwipeChevron";
import { Stagger } from "../../features/groups/components/Stagger";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  ShareIcon,
} from "../../features/groups/components/Icons";

const BODY_START_MS = 450;
const BODY_STEP_MS = 100;
const MAX_PRAYER_SEGMENTS = 4;

function prayerSegments(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const parts =
    paragraphs.length > 1 ? paragraphs : splitSentences(paragraphs[0] || trimmed);
  if (parts.length <= MAX_PRAYER_SEGMENTS) return parts;
  const joiner = paragraphs.length > 1 ? "\n\n" : " ";
  return [
    ...parts.slice(0, MAX_PRAYER_SEGMENTS - 1),
    parts.slice(MAX_PRAYER_SEGMENTS - 1).join(joiner),
  ];
}

function splitSentences(text: string): string[] {
  const tokens = text.split(/([.!?]+)\s+/);
  const sentences: string[] = [];
  for (let index = 0; index < tokens.length; index += 2) {
    const sentence = `${tokens[index] || ""}${tokens[index + 1] || ""}`.trim();
    if (sentence) sentences.push(sentence);
  }
  return sentences.length ? sentences : [text];
}

const MUSIC_VOLUME = 0.14;
const MUSIC_FADE_IN_MS = 900;
const MUSIC_FADE_OUT_MS = 700;

function fadePlayerVolume(
  player: { volume: number },
  to: number,
  duration: number,
  onDone?: () => void,
) {
  const from = player.volume;
  const startedAt = Date.now();
  let frame = 0;
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;
    const progress = Math.min(1, (Date.now() - startedAt) / duration);
    const eased = progress * progress * (3 - 2 * progress);
    player.volume = from + (to - from) * eased;
    if (progress < 1) {
      frame = requestAnimationFrame(tick);
      return;
    }
    player.volume = to;
    onDone?.();
  };

  frame = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}

interface PrayerDetailModalProps {
  card: HomePrayerCard | null;
  token: string | null;
  visible: boolean;
  loading?: boolean;
  autoPlay?: boolean;
  deckPosition?: string;
  navigationContext?: string;
  navigationDirection?: -1 | 1;
  onPrevious?: () => void;
  onNext?: () => void;
  onPlaybackComplete?: () => void;
  onPlaybackError?: () => void;
  onClose: () => void;
}

export function PrayerDetailModal({
  card,
  token,
  visible,
  loading = false,
  autoPlay = false,
  deckPosition,
  navigationContext = "single-prayer",
  navigationDirection = 1,
  onPrevious,
  onNext,
  onPlaybackComplete,
  onPlaybackError,
  onClose,
}: PrayerDetailModalProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(
    getBackgroundMusicEnabled,
  );
  const narrationUrl =
    card?.audioAvailable === false
      ? null
      : resolveAudioUrl(
          card?.narrationUrl ||
            (card?.prayeruuid
              ? `/api/prayer-audio/${card.prayeruuid}`
              : null),
        );
  const musicUrl = backgroundMusicEnabled
    ? resolveAudioUrl(DEFAULT_BACKGROUND_MUSIC)
    : null;
  const narrationPlayer = useAudioPlayer(narrationUrl, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const musicPlayer = useAudioPlayer(musicUrl, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const narrationStatus = useAudioPlayerStatus(narrationPlayer);
  const musicStatus = useAudioPlayerStatus(musicPlayer);
  const musicSessionRef = useRef<"idle" | "fading-in" | "playing" | "fading-out">(
    "idle",
  );
  const pendingPlayRef = useRef(false);
  const autoPlayKeyRef = useRef<string | null>(null);
  const reportedErrorRef = useRef<string | null>(null);
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);
  const onPlaybackErrorRef = useRef(onPlaybackError);
  const scrollOffsetRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const touchStartRef = useRef<{
    pageY: number;
    canGoPrevious: boolean;
    canGoNext: boolean;
  } | null>(null);
  const [audioMessage, setAudioMessage] = useState<string | null>(null);
  const canNavigatePrevious = Boolean(onPrevious);
  const canNavigateNext = Boolean(onNext);
  const audioPreparing = card?.audioStatus === "pending";
  const displayedAudioMessage =
    audioMessage ||
    (audioPreparing
      ? "Preparing narration…"
      : card?.audioStatus === "failed"
        ? "Narration could not be prepared."
        : null);

  useEffect(() => {
    onPlaybackCompleteRef.current = onPlaybackComplete;
    onPlaybackErrorRef.current = onPlaybackError;
  }, [onPlaybackComplete, onPlaybackError]);

  useEffect(
    () => subscribeBackgroundMusicEnabled(setBackgroundMusicEnabled),
    [],
  );

  useEffect(() => {
    if (!__DEV__ || !visible) return;
    console.info("[PrayerSwipe] Prayer detail opened", {
      context: navigationContext,
      prayeruuid: card?.prayeruuid,
      title: card?.title,
      position: deckPosition,
      canNavigatePrevious,
      canNavigateNext,
    });
  }, [
    canNavigateNext,
    canNavigatePrevious,
    card?.prayeruuid,
    card?.title,
    deckPosition,
    navigationContext,
    visible,
  ]);

  useEffect(() => {
    if (!visible) return;
    setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: "doNotMix",
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {
      if (__DEV__) console.error("[Audio] Unable to configure playback");
      setAudioMessage("Audio playback could not be prepared.");
    });
  }, [visible]);

  useEffect(() => {
    narrationPlayer.volume = 1;
    musicPlayer.loop = true;
  }, [musicPlayer, narrationPlayer]);

  useEffect(() => {
    if (!visible) {
      narrationPlayer.pause();
      pendingPlayRef.current = false;
      autoPlayKeyRef.current = null;
      reportedErrorRef.current = null;
      setAudioMessage(null);
    }
  }, [narrationPlayer, visible]);

  useEffect(() => {
    const shouldPlay = visible && Boolean(musicUrl) && musicStatus.isLoaded;
    let cancelFade: (() => void) | undefined;

    if (shouldPlay) {
      if (
        musicSessionRef.current === "playing" ||
        musicSessionRef.current === "fading-in"
      ) {
        return;
      }
      const startFromSilence = musicSessionRef.current === "idle";
      musicSessionRef.current = "fading-in";
      if (startFromSilence) {
        musicPlayer.volume = 0;
        void musicPlayer.seekTo?.(0);
      }
      musicPlayer.play();
      cancelFade = fadePlayerVolume(musicPlayer, MUSIC_VOLUME, MUSIC_FADE_IN_MS, () => {
        musicSessionRef.current = "playing";
      });
      return () => cancelFade?.();
    }

    if (musicSessionRef.current === "idle") {
      musicPlayer.pause();
      musicPlayer.volume = 0;
      return;
    }

    musicSessionRef.current = "fading-out";
    cancelFade = fadePlayerVolume(musicPlayer, 0, MUSIC_FADE_OUT_MS, () => {
      musicPlayer.pause();
      musicSessionRef.current = "idle";
    });
    return () => cancelFade?.();
  }, [musicPlayer, musicStatus.isLoaded, musicUrl, visible]);

  useEffect(() => {
    if (!visible || !autoPlay || !narrationUrl) return;
    const key = card?.prayeruuid || narrationUrl;
    if (autoPlayKeyRef.current === key) return;
    autoPlayKeyRef.current = key;
    setAudioMessage(null);
    if (narrationStatus.isLoaded) {
      narrationPlayer.play();
    } else {
      pendingPlayRef.current = true;
      setAudioMessage("Loading narration…");
    }
  }, [
    autoPlay,
    card?.prayeruuid,
    narrationPlayer,
    narrationStatus.isLoaded,
    narrationUrl,
    visible,
  ]);

  useEffect(() => {
    if (!pendingPlayRef.current || !narrationStatus.isLoaded) return;
    pendingPlayRef.current = false;
    setAudioMessage(null);
    narrationPlayer.play();
  }, [narrationPlayer, narrationStatus.isLoaded]);

  useEffect(() => {
    if (narrationStatus.didJustFinish) {
      onPlaybackCompleteRef.current?.();
    }
  }, [narrationStatus.didJustFinish]);

  useEffect(() => {
    if (!narrationStatus.error) return;
    if (__DEV__) console.error("[Audio] Narration failed");
    pendingPlayRef.current = false;
    setAudioMessage("Narration could not be loaded. Please try again.");
    if (reportedErrorRef.current !== narrationStatus.error) {
      reportedErrorRef.current = narrationStatus.error;
      onPlaybackErrorRef.current?.();
    }
  }, [narrationStatus.error, narrationUrl]);

  useEffect(() => {
    if (!musicStatus.error) return;
    if (__DEV__) console.warn("[Audio] Background music failed");
    setAudioMessage("Background music could not be loaded.");
  }, [musicStatus.error, musicUrl]);

  const toggleAudio = () => {
    if (!narrationUrl) return;
    if (narrationStatus.playing || pendingPlayRef.current) {
      pendingPlayRef.current = false;
      narrationPlayer.pause();
      setAudioMessage(null);
      return;
    }

    if (!narrationStatus.isLoaded) {
      pendingPlayRef.current = true;
      setAudioMessage("Loading narration…");
      return;
    }

    setAudioMessage(null);
    narrationPlayer.play();
  };

  const sharePrayer = () => {
    if (!card?.prayeruuid) return;
    const isLovedOne = card.subjectType === "loved_one";
    Alert.alert(
      "Share prayer",
      isLovedOne
        ? "This shares a public link to the prayer text. Names may appear in the prayer. Photos stay private."
        : "This creates a public link to this prayer.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Share", onPress: () => void confirmShare() },
      ],
    );
  };

  const confirmShare = async () => {
    if (!card?.prayeruuid) return;
    if (!token) {
      Alert.alert("Can't share yet", "Sign in to share this prayer.");
      return;
    }
    try {
      await publishPrayerCard(card.prayeruuid, token);
      trackPrayerShare(card.prayeruuid, token).catch(() => undefined);
      await Share.share({
        title: card.title,
        message: `${card.title}\n${API_BASE}/prayercards/${card.prayeruuid}`,
        url: `${API_BASE}/prayercards/${card.prayeruuid}`,
      });
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      Alert.alert(
        "Can't share yet",
        status === 403
          ? "Turn on Public prayer links in Privacy settings, then try again."
          : error instanceof Error
            ? error.message
            : "Unable to share this prayer.",
      );
    }
  };

  const handleTouchStart = (pageY: number) => {
    const offset = scrollOffsetRef.current;
    const viewportHeight = viewportHeightRef.current;
    const contentHeight = contentHeightRef.current;
    const contentFits = contentHeight <= viewportHeight + 4;
    touchStartRef.current = {
      pageY,
      canGoPrevious: Boolean(onPrevious) && (contentFits || offset <= 4),
      canGoNext:
        Boolean(onNext) &&
        (contentFits || offset + viewportHeight >= contentHeight - 4),
    };
    if (__DEV__) {
      console.info("[PrayerSwipe] Touch start", {
        context: navigationContext,
        offset: Math.round(offset),
        viewportHeight: Math.round(viewportHeight),
        contentHeight: Math.round(contentHeight),
        contentFits,
        canGoPrevious: touchStartRef.current.canGoPrevious,
        canGoNext: touchStartRef.current.canGoNext,
      });
    }
  };

  const handleTouchEnd = (pageY: number) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const deltaY = pageY - start.pageY;
    if (__DEV__) {
      console.info("[PrayerSwipe] Touch end", {
        context: navigationContext,
        deltaY: Math.round(deltaY),
        canGoPrevious: start.canGoPrevious,
        canGoNext: start.canGoNext,
      });
    }
    if (deltaY <= -56 && start.canGoNext) {
      if (__DEV__) console.info("[PrayerSwipe] Navigating to next prayer");
      onNext?.();
    } else if (deltaY >= 56 && start.canGoPrevious) {
      if (__DEV__) console.info("[PrayerSwipe] Navigating to previous prayer");
      onPrevious?.();
    }
  };

  const deckNavigationEnabled = Boolean(onPrevious || onNext);
  const insets = useSafeAreaInsets();
  const staggerDirection = navigationDirection === 1 ? "down" : "up";
  const bodySegments = prayerSegments(card?.fullPrayer || card?.text || "");
  const afterBodyDelay =
    BODY_START_MS + Math.max(bodySegments.length, 1) * BODY_STEP_MS;

  return (
    <Modal
      animationType="fade"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <KenBurnsImage
          path={card?.image}
          paths={card?.images}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.overlay]} />
        <ScrollView
          alwaysBounceVertical={false}
          bounces={!deckNavigationEnabled}
          contentContainerStyle={styles.content}
          onContentSizeChange={(_, height) => {
            contentHeightRef.current = height;
          }}
          onLayout={(event) => {
            viewportHeightRef.current = event.nativeEvent.layout.height;
          }}
          onScroll={(event) => {
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
          }}
          onTouchCancel={() => {
            touchStartRef.current = null;
          }}
          onTouchEnd={(event) => handleTouchEnd(event.nativeEvent.pageY)}
          onTouchStart={(event) => handleTouchStart(event.nativeEvent.pageY)}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator color={colors.title} size="large" />
          ) : (
            <View key={card?.prayeruuid || card?.deckIndex || "prayer-detail"}>
              <Stagger delay={200} direction={staggerDirection}>
                <Text style={styles.verse}>
                  {card?.verse || "PERSONAL PRAYER"}
                </Text>
              </Stagger>
              <Stagger delay={300} direction={staggerDirection}>
                <Text style={styles.title}>{card?.title}</Text>
              </Stagger>
              <View style={styles.prayerBody}>
                {bodySegments.map((segment, index) => (
                  <Stagger
                    key={`${index}-${segment.slice(0, 24)}`}
                    delay={BODY_START_MS + index * BODY_STEP_MS}
                    direction={staggerDirection}
                  >
                    <Text style={styles.prayer}>{segment}</Text>
                  </Stagger>
                ))}
              </View>
              {card?.date ? (
                <Stagger delay={afterBodyDelay} direction={staggerDirection}>
                  <Text style={styles.date}>{card.date}</Text>
                </Stagger>
              ) : null}
              {onPrevious ? (
                <Stagger
                  delay={afterBodyDelay + (card?.date ? BODY_STEP_MS : 0)}
                  direction={staggerDirection}
                >
                  <View style={styles.swipeNavigationBottom}>
                    <SwipeChevron direction="down" onPress={onPrevious} />
                  </View>
                </Stagger>
              ) : null}
              {displayedAudioMessage ? (
                <Stagger
                  delay={afterBodyDelay + BODY_STEP_MS * 2}
                  direction={staggerDirection}
                >
                  <Text style={styles.audioMessage}>{displayedAudioMessage}</Text>
                </Stagger>
              ) : null}
            </View>
          )}
        </ScrollView>
        {onNext ? (
          <View
            style={[
              styles.swipeNavigationTop,
              { top: Math.max(insets.top, 12) + 6 },
            ]}
          >
            <SwipeChevron direction="up" onPress={onNext} />
          </View>
        ) : null}
        {deckPosition ? (
          <Text style={styles.deckPosition}>{deckPosition} · Swipe</Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              audioPreparing
                ? "Preparing prayer audio"
                : narrationStatus.playing
                  ? "Pause prayer"
                  : "Listen to prayer"
            }
            accessibilityState={{ disabled: !narrationUrl }}
            disabled={!narrationUrl}
            hitSlop={4}
            onPress={toggleAudio}
            style={({ pressed }) => [
              styles.action,
              styles.listenAction,
              narrationStatus.playing && styles.actionActive,
              !narrationUrl && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {audioPreparing || pendingPlayRef.current ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : narrationStatus.playing ? (
              <PauseIcon color={colors.accent} size={17} />
            ) : (
              <PlayIcon color={colors.accent} size={17} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share prayer"
            accessibilityState={{ disabled: !card?.prayeruuid }}
            disabled={!card?.prayeruuid}
            hitSlop={4}
            onPress={sharePrayer}
            style={({ pressed }) => [
              styles.action,
              !card?.prayeruuid && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <ShareIcon color={colors.title} size={17} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close prayer"
            hitSlop={4}
            onPress={onClose}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <CloseIcon color={colors.title} size={17} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  overlay: {
    backgroundColor: colors.overlayModal,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 90,
    paddingBottom: 100,
  },
  verse: {
    color: colors.accentText,
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  title: {
    color: colors.title,
    fontFamily: fonts.displayMedium,
    fontSize: 36,
    fontWeight: "500",
    letterSpacing: -0.9,
    lineHeight: 40,
    marginBottom: 24,
  },
  prayerBody: {
    gap: 16,
  },
  prayer: {
    color: colors.titleSoft,
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 29,
  },
  date: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 24,
    textTransform: "uppercase",
  },
  audioMessage: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 14,
  },
  deckPosition: {
    position: "absolute",
    bottom: 42,
    left: 28,
    color: colors.mutedSoft,
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  swipeNavigationTop: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  swipeNavigationBottom: {
    alignItems: "center",
    marginTop: 16,
  },
  actions: {
    position: "absolute",
    bottom: 28,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  action: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.glassFillHover,
    borderColor: colors.glassBorderHairline,
    borderWidth: 1,
  },
  actionActive: {
    borderColor: colors.accentBorderActive,
    backgroundColor: colors.accentFillSolid,
  },
  listenAction: {
    borderColor: colors.accentBorderPill,
    backgroundColor: colors.accentFillSelected,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.72,
  },
  });
}
