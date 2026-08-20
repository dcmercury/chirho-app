import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import type { HomeProfile } from "../../../types/home";
import {
  DEFAULT_BACKGROUND_MUSIC,
  resolveAudioUrl,
} from "../../../lib/assets";
import { InlineError, Pill, Section, ToggleRow, useProfileStyles } from "./ProfileControls";

export function PrayerPreferencesSection({
  visible,
  traditions,
  voices,
  backgroundMusicEnabled,
  traditionPending,
  voicePending,
  backgroundMusicPending,
  traditionError,
  voiceError,
  backgroundMusicError,
  onSelectTradition,
  onSelectVoice,
  onChangeBackgroundMusic,
}: {
  visible: boolean;
  traditions: HomeProfile["traditions"];
  voices: HomeProfile["voices"];
  backgroundMusicEnabled: boolean;
  traditionPending: boolean;
  voicePending: boolean;
  backgroundMusicPending: boolean;
  traditionError?: string;
  voiceError?: string;
  backgroundMusicError?: string;
  onSelectTradition: (id: string) => void;
  onSelectVoice: (id: string) => void;
  onChangeBackgroundMusic: (enabled: boolean) => void;
}) {
  const styles = useProfileStyles();
  const [previewOn, setPreviewOn] = useState(backgroundMusicEnabled);
  const [previewArmed, setPreviewArmed] = useState(false);
  const musicUrl =
    visible && previewArmed && previewOn
      ? resolveAudioUrl(DEFAULT_BACKGROUND_MUSIC)
      : null;
  const musicPlayer = useAudioPlayer(musicUrl, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const musicStatus = useAudioPlayerStatus(musicPlayer);

  useEffect(() => {
    setPreviewOn(backgroundMusicEnabled);
  }, [backgroundMusicEnabled]);

  useEffect(() => {
    musicPlayer.volume = 0.14;
    musicPlayer.loop = true;
  }, [musicPlayer]);

  useEffect(() => {
    if (!visible) {
      setPreviewArmed(false);
      musicPlayer.pause();
      return;
    }
    if (!previewOn || !previewArmed) {
      musicPlayer.pause();
      return;
    }
    setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: "doNotMix",
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
    }).catch(() => undefined);
    if (musicStatus.isLoaded && !musicStatus.playing) {
      musicPlayer.play();
    }
  }, [
    musicPlayer,
    musicStatus.isLoaded,
    musicStatus.playing,
    previewArmed,
    previewOn,
    visible,
  ]);
  return (
    <>
      <Section title="Tradition">
        {traditions.locked ? (
          <Text style={styles.settingMeta}>
            {traditions.options.find((option) => option.id === traditions.selected)
              ?.label || traditions.selected}{" "}
            · set by your community
          </Text>
        ) : (
          <View style={styles.pills}>
            {traditions.options.map((option) => (
              <Pill
                key={option.id}
                active={option.id === traditions.selected}
                disabled={traditionPending}
                label={option.label}
                onPress={() => onSelectTradition(option.id)}
              />
            ))}
          </View>
        )}
        <InlineError message={traditionError} />
      </Section>
      <Section title="Voice">
        <View style={styles.pills}>
          {voices.options.map((option) => (
            <Pill
              key={option.id}
              active={option.id === voices.selected}
              disabled={voicePending}
              label={option.label}
              onPress={() => onSelectVoice(option.id)}
            />
          ))}
        </View>
        <InlineError message={voiceError} />
      </Section>
      <Section title="Sound">
        <ToggleRow
          disabled={backgroundMusicPending}
          label="Background music"
          onValueChange={(enabled) => {
            setPreviewOn(enabled);
            setPreviewArmed(enabled);
            onChangeBackgroundMusic(enabled);
          }}
          value={previewOn}
        />
        <InlineError message={backgroundMusicError} />
      </Section>
    </>
  );
}
