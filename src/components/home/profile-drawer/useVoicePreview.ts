import { useEffect, useState } from "react";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { resolveAudioUrl } from "../../../lib/assets";

/** Pre-generated Lord's Prayer samples, one per voice key. */
const PREVIEW_DIRECTORY = "/audio/voice-previews";

/**
 * Plays the Lord's Prayer sample for one voice at a time. `enabled` lets the
 * caller stop playback when the drawer closes.
 */
export function useVoicePreview(enabled: boolean) {
  const [voiceKey, setVoiceKey] = useState<string | null>(null);
  const url =
    enabled && voiceKey
      ? resolveAudioUrl(`${PREVIEW_DIRECTORY}/${voiceKey}.mp3`)
      : null;
  const player = useAudioPlayer(url, { downloadFirst: true });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!enabled) {
      player.pause();
      setVoiceKey(null);
      return;
    }
    if (!voiceKey) {
      player.pause();
      return;
    }
    if (status.didJustFinish) {
      player.pause();
      setVoiceKey(null);
      return;
    }
    setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: "doNotMix",
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => undefined);
    if (status.isLoaded && !status.playing) {
      player.play();
    }
  }, [
    enabled,
    player,
    status.didJustFinish,
    status.isLoaded,
    status.playing,
    voiceKey,
  ]);

  const toggle = (nextVoiceKey: string) => {
    if (voiceKey === nextVoiceKey) {
      player.pause();
      setVoiceKey(null);
      return;
    }
    setVoiceKey(nextVoiceKey);
  };

  return { playingVoiceKey: voiceKey, toggle };
}
