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
  onClose: () => void;
}

export function PrayerDetailModal({
  card,
  token,
  visible,
  loading = false,
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
  const [audioMessage, setAudioMessage] = useState<string | null>(null);
  const audioPreparing = card?.audioStatus === "pending";
  const displayedAudioMessage =
    audioMessage ||
    (audioPreparing
      ? "Preparing narration…"
      : card?.audioStatus === "failed"
        ? "Narration could not be prepared."
        : null);

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
      setAudioMessage(null);
    }
  }, [musicPlayer, narrationPlayer, visible]);

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
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="large" />
          ) : (
            <>
              <Text style={styles.verse}>{card?.verse || "PERSONAL PRAYER"}</Text>
              <Text style={styles.title}>{card?.title}</Text>
              <Text style={styles.prayer}>{card?.fullPrayer || card?.text}</Text>
              {card?.date ? <Text style={styles.date}>{card.date}</Text> : null}
              {displayedAudioMessage ? (
                <Text style={styles.audioMessage}>{displayedAudioMessage}</Text>
              ) : null}
            </>
          )}
        </ScrollView>
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
