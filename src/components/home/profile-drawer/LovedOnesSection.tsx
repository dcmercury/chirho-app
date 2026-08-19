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
  token,
  isPending,
  error,
  onManage,
  onRemove,
}: {
  lovedOnes: HomeProfile["managedLovedOnes"];
  avatarById: Record<string, string | undefined>;
  token: string | null;
  isPending: (id: string) => boolean;
  error?: string;
  onManage: (id: string, firstName: string) => void;
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
                token={token}
              />
              <View style={styles.manageCopy}>
                <Text style={styles.manageName}>{person.firstName}</Text>
                <Text style={styles.manageMeta}>
                  {person.categories.join(", ") || "No categories"}
                </Text>
              </View>
              <View style={styles.manageActions}>
                <Pressable
                  accessibilityLabel={`Manage photos of ${person.firstName}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: pending }}
                  disabled={pending}
                  onPress={() => onManage(person.id, person.firstName)}
                  style={[styles.manageActionTouch, pending && styles.disabled]}
                >
                  <Text style={styles.join}>Photos</Text>
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
        <Text style={styles.empty}>No loved ones yet.</Text>
      )}
      <InlineError message={error} />
    </Section>
  );
}
