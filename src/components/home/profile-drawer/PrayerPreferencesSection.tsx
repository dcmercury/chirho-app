import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import type { HomeProfile } from "../../../types/home";
import type { LibraryMusicTrack } from "../../../lib/musicLibrary";
import { resolveAudioUrl } from "../../../lib/assets";
import {
  InlineError,
  Pill,
  Section,
  ToggleRow,
  VoicePill,
  useProfileStyles,
} from "./ProfileControls";
import { useVoicePreview } from "./useVoicePreview";

type SamplePlaybackState = "idle" | "loading" | "playing";

function MusicSamplePlayer({
  track,
  onFinished,
  onError,
  onStateChange,
}: {
  track: LibraryMusicTrack;
  onFinished: () => void;
  onError: (message: string) => void;
  onStateChange: (state: SamplePlaybackState) => void;
}) {
  const player = useAudioPlayer(resolveAudioUrl(track.url), {
    preferredForwardBufferDuration: 10,
  });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    player.volume = 0.14;
    player.loop = false;
  }, [player]);

  useEffect(() => {
    if (status.error) {
      if (__DEV__) console.warn("[Audio] Music sample failed", status.error);
      onError("This music sample could not be loaded.");
      onFinished();
      return;
    }
    if (status.didJustFinish) {
      onFinished();
      return;
    }

    onStateChange(status.playing ? "playing" : "loading");
    if (!status.isLoaded || status.playing) return;

    void setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: "doNotMix",
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    })
      .then(() => player.play())
      .catch(() => {
        onError("This music sample could not be played.");
        onFinished();
      });
  }, [
    onError,
    onFinished,
    onStateChange,
    player,
    status.didJustFinish,
    status.error,
    status.isLoaded,
    status.playing,
  ]);

  return null;
}

export function PrayerPreferencesSection({
  visible,
  traditions,
  voices,
  musicTracks,
  backgroundMusicEnabled,
  backgroundMusicId,
  traditionPending,
  voicePending,
  backgroundMusicPending,
  traditionError,
  voiceError,
  backgroundMusicError,
  onSelectTradition,
  onSelectVoice,
  onChangeBackgroundMusic,
  onSelectBackgroundMusic,
}: {
  visible: boolean;
  traditions: HomeProfile["traditions"];
  voices: HomeProfile["voices"];
  musicTracks: LibraryMusicTrack[];
  backgroundMusicEnabled: boolean;
  backgroundMusicId?: string | null;
  traditionPending: boolean;
  voicePending: boolean;
  backgroundMusicPending: boolean;
  traditionError?: string;
  voiceError?: string;
  backgroundMusicError?: string;
  onSelectTradition: (id: string) => void;
  onSelectVoice: (id: string) => void;
  onChangeBackgroundMusic: (enabled: boolean) => void;
  onSelectBackgroundMusic: (track: LibraryMusicTrack) => void;
}) {
  const styles = useProfileStyles();
  const [previewOn, setPreviewOn] = useState(backgroundMusicEnabled);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [samplePlaybackState, setSamplePlaybackState] =
    useState<SamplePlaybackState>("idle");
  const [sampleError, setSampleError] = useState<string>();
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const previewOnRef = useRef(previewOn);
  previewOnRef.current = previewOn;
  const selectedId =
    localSelectedId || backgroundMusicId || musicTracks[0]?.musicuuid;
  const sampleTrack = previewingId
    ? musicTracks.find((track) => track.musicuuid === previewingId)
    : null;
  const { playingVoiceKey, toggle: toggleVoicePreview } =
    useVoicePreview(visible);
  const stopMusicPreview = useCallback(() => {
    setPreviewingId(null);
    setSamplePlaybackState("idle");
  }, []);

  useEffect(() => {
    if (backgroundMusicPending) return;
    setPreviewOn(backgroundMusicEnabled);
    previewOnRef.current = backgroundMusicEnabled;
    setLocalSelectedId(null);
  }, [backgroundMusicEnabled, backgroundMusicId, backgroundMusicPending]);

  useEffect(() => {
    if (!previewingId || samplePlaybackState !== "playing") return;
    const timer = setTimeout(stopMusicPreview, 10000);
    return () => clearTimeout(timer);
  }, [previewingId, samplePlaybackState, stopMusicPreview]);

  useEffect(() => {
    if (!visible) stopMusicPreview();
  }, [stopMusicPreview, visible]);

  const toggleMusicPreview = (musicuuid: string) => {
    if (playingVoiceKey) toggleVoicePreview(playingVoiceKey);
    if (previewingId === musicuuid) {
      stopMusicPreview();
      return;
    }
    setSampleError(undefined);
    setSamplePlaybackState("loading");
    setPreviewingId(musicuuid);
  };

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
            <VoicePill
              key={option.id}
              active={option.id === voices.selected}
              disabled={voicePending}
              label={option.label}
              onPress={() => onSelectVoice(option.id)}
              onPreview={() => {
                stopMusicPreview();
                toggleVoicePreview(option.id);
              }}
              playing={playingVoiceKey === option.id}
            />
          ))}
        </View>
        <Text style={styles.settingMeta}>
          Tap a name to choose it, or the play icon to hear the Lord&apos;s
          Prayer in that voice.
        </Text>
        <InlineError message={voiceError} />
      </Section>
      <Section title="Sound">
        <ToggleRow
          label="Background music"
          onValueChange={() => {
            const enabled = !previewOnRef.current;
            previewOnRef.current = enabled;
            setPreviewOn(enabled);
            if (!enabled) stopMusicPreview();
            onChangeBackgroundMusic(enabled);
          }}
          value={previewOn}
        />
        {musicTracks.length > 0 ? (
          <>
            <View style={styles.pills}>
              {musicTracks.map((track) => (
                <VoicePill
                  key={track.musicuuid}
                  active={track.musicuuid === selectedId}
                  label={track.title}
                  onPress={() => {
                    setLocalSelectedId(track.musicuuid);
                    previewOnRef.current = true;
                    setPreviewOn(true);
                    stopMusicPreview();
                    onSelectBackgroundMusic(track);
                  }}
                  onPreview={() => toggleMusicPreview(track.musicuuid)}
                  loading={
                    previewingId === track.musicuuid &&
                    samplePlaybackState === "loading"
                  }
                  playing={
                    previewingId === track.musicuuid &&
                    samplePlaybackState === "playing"
                  }
                />
              ))}
            </View>
            <Text style={styles.settingMeta}>
              Tap a name to choose it, or the play icon to hear a sample.
            </Text>
          </>
        ) : null}
        <InlineError message={sampleError || backgroundMusicError} />
      </Section>
      {visible && sampleTrack ? (
        <MusicSamplePlayer
          key={sampleTrack.musicuuid}
          track={sampleTrack}
          onError={setSampleError}
          onFinished={stopMusicPreview}
          onStateChange={setSamplePlaybackState}
        />
      ) : null}
    </>
  );
}
