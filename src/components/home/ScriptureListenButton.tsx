import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@clerk/expo";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { narrateScripture } from "../../lib/api";
import {
  getBackgroundMusicEnabled,
  getBackgroundMusicUrl,
  subscribeBackgroundMusicEnabled,
  subscribeBackgroundMusicUrl,
} from "../../lib/backgroundMusicPreference";
import { DEFAULT_BACKGROUND_MUSIC, resolveAudioUrl } from "../../lib/assets";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { PauseIcon, PlayIcon } from "../../features/groups/components/Icons";

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

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: { alignItems: "flex-end" },
    button: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      backgroundColor: colors.glassFillHover,
      borderColor: colors.glassBorderHairline,
      borderWidth: 1,
    },
    active: {
      borderColor: colors.accentBorderActive,
      backgroundColor: colors.accentFillSolid,
    },
    pressed: { opacity: 0.65 },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 8,
    },
  });
}

export function ScriptureListenButton({ passageId }: { passageId: string }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(getBackgroundMusicEnabled);
  const [musicTrack, setMusicTrack] = useState(getBackgroundMusicUrl);
  const wantPlay = useRef(false);
  const musicSession = useRef<"idle" | "fading-in" | "playing" | "fading-out">(
    "idle",
  );
  const player = useAudioPlayer(resolveAudioUrl(audioPath), {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const musicUrl = musicEnabled
    ? resolveAudioUrl(musicTrack || DEFAULT_BACKGROUND_MUSIC)
    : null;
  const musicPlayer = useAudioPlayer(musicUrl, {
    keepAudioSessionActive: true,
    preferredForwardBufferDuration: 15,
  });
  const status = useAudioPlayerStatus(player);
  const musicStatus = useAudioPlayerStatus(musicPlayer);

  useEffect(() => {
    setAudioPath(null);
    setPreparing(false);
    setError(null);
    wantPlay.current = false;
    player.pause();
    musicPlayer.pause();
    musicPlayer.volume = 0;
    musicSession.current = "idle";
  }, [musicPlayer, passageId, player]);

  useEffect(
    () => subscribeBackgroundMusicEnabled(setMusicEnabled),
    [],
  );

  useEffect(() => subscribeBackgroundMusicUrl(setMusicTrack), []);

  useEffect(() => {
    player.volume = 1;
    musicPlayer.loop = true;
  }, [musicPlayer, player]);

  useEffect(() => {
    const shouldPlay = status.playing && Boolean(musicUrl) && musicStatus.isLoaded;
    let cancelFade: (() => void) | undefined;

    if (shouldPlay) {
      if (
        musicSession.current === "playing" ||
        musicSession.current === "fading-in"
      ) {
        return;
      }
      const startFromSilence = musicSession.current === "idle";
      musicSession.current = "fading-in";
      if (startFromSilence) {
        musicPlayer.volume = 0;
        void musicPlayer.seekTo?.(0);
      }
      musicPlayer.play();
      cancelFade = fadePlayerVolume(musicPlayer, MUSIC_VOLUME, MUSIC_FADE_IN_MS, () => {
        musicSession.current = "playing";
      });
      return () => cancelFade?.();
    }

    if (musicSession.current === "idle") {
      musicPlayer.pause();
      musicPlayer.volume = 0;
      return;
    }

    musicSession.current = "fading-out";
    cancelFade = fadePlayerVolume(musicPlayer, 0, MUSIC_FADE_OUT_MS, () => {
      musicPlayer.pause();
      musicSession.current = "idle";
    });
    return () => cancelFade?.();
  }, [musicPlayer, musicStatus.isLoaded, musicUrl, status.playing]);

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: "doNotMix",
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!wantPlay.current || !status.isLoaded) return;
    wantPlay.current = false;
    player.play();
  }, [player, status.isLoaded, audioPath]);

  const toggle = async () => {
    if (preparing) return;
    if (status.playing) {
      wantPlay.current = false;
      player.pause();
      return;
    }
    if (audioPath) {
      if (status.isLoaded) player.play();
      else wantPlay.current = true;
      return;
    }
    setPreparing(true);
    setError(null);
    wantPlay.current = true;
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      setAudioPath(await narrateScripture(token, passageId));
    } catch (err) {
      wantPlay.current = false;
      setError(
        err instanceof Error ? err.message : "Narration could not be prepared.",
      );
    } finally {
      setPreparing(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityLabel={
          preparing ? "Preparing narration" : status.playing ? "Pause scripture" : "Listen to scripture"
        }
        accessibilityRole="button"
        onPress={() => {
          void toggle();
        }}
        style={({ pressed }) => [
          styles.button,
          status.playing && styles.active,
          pressed && styles.pressed,
        ]}
      >
        {preparing ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : status.playing ? (
          <PauseIcon color={colors.accent} size={17} />
        ) : (
          <PlayIcon color={colors.accent} size={17} />
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
