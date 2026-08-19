import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import {
  API_BASE,
  DEFAULT_BACKGROUND_MUSIC,
  resolveAudioUrl,
  resolveImage,
} from "../../lib/assets";
import { trackPrayerShare } from "../../lib/api";
import { colors, fonts } from "../../theme/tokens";
import type { HomePrayerCard } from "../../types/home";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  ShareIcon,
} from "../../features/groups/components/Icons";

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

function SwipeChevron({
  direction,
  onPress,
}: {
  direction: "up" | "down";
  onPress: () => void;
}) {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, {
        duration: 850,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.45, 0.95]),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [direction === "up" ? 3 : -3, direction === "up" ? -3 : 3],
        ),
      },
    ],
  }));

  return (
    <Pressable
      accessibilityLabel={
        direction === "up"
          ? "Next prayer, swipe up"
          : "Previous prayer, swipe down"
      }
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.swipeChevronButton,
        pressed && styles.swipeChevronPressed,
      ]}
    >
      <Animated.View style={animatedStyle}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d={direction === "up" ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"}
            stroke={colors.white}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
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
  const narrationUrl =
    card?.audioAvailable === false
      ? null
      : resolveAudioUrl(
          card?.narrationUrl ||
            (card?.prayeruuid
              ? `/api/prayer-audio/${card.prayeruuid}`
              : null),
        );
  const musicUrl =
    card?.backgroundMusicVolume === 0
      ? null
      : resolveAudioUrl(card?.backgroundMusicUrl || DEFAULT_BACKGROUND_MUSIC);
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
    }).catch((error) => {
      console.error("[Audio] Unable to configure playback:", error);
      setAudioMessage("Audio playback could not be prepared.");
    });
  }, [visible]);

  useEffect(() => {
    narrationPlayer.volume = 1;
    musicPlayer.volume = card?.backgroundMusicVolume ?? 0.14;
    musicPlayer.loop = true;
  }, [
    card?.backgroundMusicVolume,
    musicPlayer,
    narrationPlayer,
  ]);

  useEffect(() => {
    if (!visible) {
      narrationPlayer.pause();
      musicPlayer.pause();
      pendingPlayRef.current = false;
      autoPlayKeyRef.current = null;
      reportedErrorRef.current = null;
      setAudioMessage(null);
    }
  }, [musicPlayer, narrationPlayer, visible]);

  useEffect(() => {
    if (!visible || !autoPlay || !narrationUrl) return;
    const key = card?.prayeruuid || narrationUrl;
    if (autoPlayKeyRef.current === key) return;
    autoPlayKeyRef.current = key;
    setAudioMessage(null);
    if (narrationStatus.isLoaded) {
      narrationPlayer.play();
      if (musicStatus.isLoaded) musicPlayer.play();
    } else {
      pendingPlayRef.current = true;
      setAudioMessage("Loading narration…");
    }
  }, [
    autoPlay,
    card?.prayeruuid,
    musicPlayer,
    musicStatus.isLoaded,
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
    if (musicStatus.isLoaded) musicPlayer.play();
  }, [
    musicPlayer,
    musicStatus.isLoaded,
    narrationPlayer,
    narrationStatus.isLoaded,
  ]);

  useEffect(() => {
    if (
      narrationStatus.playing &&
      musicUrl &&
      musicStatus.isLoaded &&
      !musicStatus.playing
    ) {
      musicPlayer.play();
    }
  }, [
    musicPlayer,
    musicStatus.isLoaded,
    musicStatus.playing,
    musicUrl,
    narrationStatus.playing,
  ]);

  useEffect(() => {
    if (narrationStatus.didJustFinish) {
      musicPlayer.pause();
      onPlaybackCompleteRef.current?.();
    }
  }, [musicPlayer, narrationStatus.didJustFinish]);

  useEffect(() => {
    if (!narrationStatus.error) return;
    console.error("[Audio] Narration failed:", {
      error: narrationStatus.error,
      url: narrationUrl,
    });
    pendingPlayRef.current = false;
    musicPlayer.pause();
    setAudioMessage("Narration could not be loaded. Please try again.");
    if (reportedErrorRef.current !== narrationStatus.error) {
      reportedErrorRef.current = narrationStatus.error;
      onPlaybackErrorRef.current?.();
    }
  }, [musicPlayer, narrationStatus.error, narrationUrl]);

  useEffect(() => {
    if (!musicStatus.error) return;
    console.warn("[Audio] Background music failed:", {
      error: musicStatus.error,
      url: musicUrl,
    });
    setAudioMessage("Narration is available, but music could not be loaded.");
  }, [musicStatus.error, musicUrl]);

  const toggleAudio = () => {
    if (!narrationUrl) return;
    if (narrationStatus.playing || pendingPlayRef.current) {
      pendingPlayRef.current = false;
      narrationPlayer.pause();
      musicPlayer.pause();
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
    if (musicStatus.isLoaded) musicPlayer.play();
  };

  const sharePrayer = async () => {
    if (!card?.prayeruuid) return;
    if (token) {
      trackPrayerShare(card.prayeruuid, token).catch(() => undefined);
    }
    await Share.share({
      title: card.title,
      message: `${card.title}\n${API_BASE}/prayercards/${card.prayeruuid}`,
      url: `${API_BASE}/prayercards/${card.prayeruuid}`,
    });
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

  const contentEntrance = (
    navigationDirection === 1 ? FadeInDown : FadeInUp
  )
    .duration(500)
    .easing(Easing.bezier(0.22, 1, 0.36, 1))
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: navigationDirection === 1 ? 24 : -24 }],
    })
    .reduceMotion(ReduceMotion.System);
  const deckNavigationEnabled = Boolean(onPrevious || onNext);

  return (
    <Modal
      animationType="fade"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Image
          source={resolveImage(card?.image)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={350}
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
            <ActivityIndicator color={colors.white} size="large" />
          ) : (
            <Animated.View
              key={card?.prayeruuid || card?.deckIndex || "prayer-detail"}
              entering={contentEntrance}
            >
              <Text style={styles.verse}>{card?.verse || "PERSONAL PRAYER"}</Text>
              <Text style={styles.title}>{card?.title}</Text>
              <Text style={styles.prayer}>{card?.fullPrayer || card?.text}</Text>
              {card?.date ? <Text style={styles.date}>{card.date}</Text> : null}
              {displayedAudioMessage ? (
                <Text style={styles.audioMessage}>{displayedAudioMessage}</Text>
              ) : null}
            </Animated.View>
          )}
        </ScrollView>
        {deckNavigationEnabled ? (
          <View style={styles.swipeNavigation}>
            {onNext ? <SwipeChevron direction="up" onPress={onNext} /> : null}
            {onPrevious ? (
              <SwipeChevron direction="down" onPress={onPrevious} />
            ) : null}
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
            <ShareIcon color={colors.white} size={17} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close prayer"
            hitSlop={4}
            onPress={onClose}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <CloseIcon color={colors.white} size={17} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 90,
    paddingBottom: 100,
  },
  verse: {
    color: colors.accent,
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  title: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 36,
    fontWeight: "500",
    letterSpacing: -0.9,
    lineHeight: 40,
    marginBottom: 24,
  },
  prayer: {
    color: "rgba(255,255,255,0.82)",
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
  swipeNavigation: {
    position: "absolute",
    right: 14,
    top: "43%",
    gap: 8,
    alignItems: "center",
  },
  swipeChevronButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.34)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  swipeChevronPressed: {
    backgroundColor: "rgba(249,115,22,0.2)",
    borderColor: "rgba(249,115,22,0.48)",
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
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
  },
  actionActive: {
    borderColor: "rgba(249,115,22,0.65)",
    backgroundColor: "rgba(249,115,22,0.28)",
  },
  listenAction: {
    borderColor: "rgba(249,115,22,0.45)",
    backgroundColor: "rgba(249,115,22,0.15)",
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.72,
  },
});
