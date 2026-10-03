import { Text, View } from "react-native";
import type { HomeProfile } from "../../../types/home";
import { InlineError, Pill, Section, useProfileStyles } from "./ProfileControls";

export function BibleTranslationSection({
  translations,
  pending,
  error,
  onSelect,
}: {
  translations: NonNullable<HomeProfile["bibleTranslations"]>;
  pending: boolean;
  error?: string;
  onSelect: (id: string) => void;
}) {
  const styles = useProfileStyles();
  const selected = translations.options.find(
    (option) => option.id === translations.selected,
  );

  return (
    <Section title="Bible translation">
      <View style={styles.pills}>
        {translations.options.map((option) => (
          <Pill
            key={option.id}
            active={option.id === translations.selected}
            disabled={pending}
            label={option.label}
            onPress={() => {
              if (option.id !== translations.selected) onSelect(option.id);
            }}
          />
        ))}
      </View>
      <Text style={styles.settingMeta}>
        {selected?.description
          ? `${selected.description}. Used when you open Scripture from a message.`
          : "Used when you open Scripture from a message."}
      </Text>
      <InlineError message={error} />
    </Section>
  );
}
