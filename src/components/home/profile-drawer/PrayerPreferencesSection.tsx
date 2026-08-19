import { View } from "react-native";
import type { HomeProfile } from "../../../types/home";
import { InlineError, Pill, Section, styles } from "./ProfileControls";

export function PrayerPreferencesSection({
  traditions,
  voices,
  traditionPending,
  voicePending,
  traditionError,
  voiceError,
  onSelectTradition,
  onSelectVoice,
}: {
  traditions: HomeProfile["traditions"];
  voices: HomeProfile["voices"];
  traditionPending: boolean;
  voicePending: boolean;
  traditionError?: string;
  voiceError?: string;
  onSelectTradition: (id: string) => void;
  onSelectVoice: (id: string) => void;
}) {
  return (
    <>
      <Section title="Tradition">
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
    </>
  );
}
