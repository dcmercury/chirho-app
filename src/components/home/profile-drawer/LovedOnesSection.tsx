import { Pressable, Text, View } from "react-native";
import type { HomeProfile } from "../../../types/home";
import {
  InlineError,
  ManageAvatar,
  Section,
  styles,
} from "./ProfileControls";

export function LovedOnesSection({
  lovedOnes,
  avatarById,
  isPending,
  error,
  onRemove,
}: {
  lovedOnes: HomeProfile["managedLovedOnes"];
  avatarById: Record<string, string | undefined>;
  isPending: (id: string) => boolean;
  error?: string;
  onRemove: (id: string, firstName: string) => void;
}) {
  return (
    <Section title="Loved ones">
      {lovedOnes.length ? (
        lovedOnes.map((person) => {
          const pending = isPending(person.id);
          return (
            <View key={person.id} style={styles.manageRow}>
              <ManageAvatar
                label={person.firstName}
                source={avatarById[person.id]}
              />
              <View style={styles.manageCopy}>
                <Text style={styles.manageName}>{person.firstName}</Text>
                <Text style={styles.manageMeta}>
                  {person.categories.join(", ") || "No categories"}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={`Remove ${person.firstName}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: pending }}
                disabled={pending}
                onPress={() => onRemove(person.id, person.firstName)}
                style={pending && styles.disabled}
              >
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          );
        })
      ) : (
        <Text style={styles.empty}>No loved ones yet.</Text>
      )}
      <InlineError message={error} />
    </Section>
  );
}
