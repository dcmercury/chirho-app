import { Pressable, Text, View } from "react-native";
import type { HomeProfile } from "../../../types/home";
import {
  InlineError,
  ManageAvatar,
  Section,
  useProfileStyles,
} from "./ProfileControls";

export function LovedOnesSection({
  lovedOnes,
  avatarById,
  isPending,
  error,
  onEdit,
  onRemove,
}: {
  lovedOnes: HomeProfile["managedLovedOnes"];
  avatarById: Record<string, string | undefined>;
  isPending: (id: string) => boolean;
  error?: string;
  onEdit: (person: HomeProfile["managedLovedOnes"][number]) => void;
  onRemove: (id: string, firstName: string) => void;
}) {
  const styles = useProfileStyles();
  return (
    <Section title="People">
      {lovedOnes.length ? (
        lovedOnes.map((person) => {
          const pending = isPending(person.id);
          return (
            <View key={person.id} style={styles.manageRow}>
              <Pressable
                accessibilityLabel={`Edit ${person.firstName}`}
                accessibilityRole="button"
                disabled={pending}
                onPress={() => onEdit(person)}
              >
                <ManageAvatar
                  label={person.firstName}
                  source={avatarById[person.id]}
                />
              </Pressable>
              <View style={styles.manageCopy}>
                <Text style={styles.manageName}>{person.firstName}</Text>
                <Text style={styles.manageMeta}>
                  {person.categories.join(", ") || "No categories"}
                </Text>
              </View>
              <View style={styles.manageActions}>
                <Pressable
                  accessibilityLabel={`Edit ${person.firstName}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: pending }}
                  disabled={pending}
                  onPress={() => onEdit(person)}
                  style={[styles.manageActionTouch, pending && styles.disabled]}
                >
                  <Text style={styles.join}>Edit</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Remove ${person.firstName}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: pending }}
                  disabled={pending}
                  onPress={() => onRemove(person.id, person.firstName)}
                  style={[styles.manageActionTouch, pending && styles.disabled]}
                >
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.empty}>No people yet.</Text>
      )}
      <InlineError message={error} />
    </Section>
  );
}
