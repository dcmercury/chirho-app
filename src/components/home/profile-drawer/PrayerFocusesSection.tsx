import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { PrayerFocus, PrayerFocusInput } from "../../../types/home";
import { PrayerFocusModal } from "../PrayerFocusModal";
import { PrayerFocusTypeIcon } from "../PrayerFocusTypeIcon";
import { InlineError, Section, styles } from "./ProfileControls";

export function PrayerFocusesSection({
  focuses,
  isPending,
  getError,
  onSave,
  onRemove,
}: {
  focuses: PrayerFocus[];
  isPending: (focusuuid: string) => boolean;
  getError: (focusuuid: string) => string | undefined;
  onSave: (focus: PrayerFocus, input: PrayerFocusInput) => Promise<boolean>;
  onRemove: (focusuuid: string, title: string) => void;
}) {
  const [editing, setEditing] = useState<PrayerFocus | null>(null);

  return (
    <Section title="Prayer focuses">
      {focuses.length ? (
        focuses.map((focus) => {
          const pending = isPending(focus.focusuuid);
          return (
            <View key={focus.focusuuid} style={styles.manageRow}>
              <View style={[styles.manageAvatar, styles.manageAvatarFallback]}>
                <PrayerFocusTypeIcon type={focus.type} color="#f97316" size={17} />
              </View>
              <View style={styles.manageCopy}>
                <Text style={styles.manageName}>{focus.title}</Text>
                <Text numberOfLines={1} style={styles.manageMeta}>
                  {focus.categories.join(", ") || focus.period}
                </Text>
              </View>
              <View style={styles.manageActions}>
                <Pressable
                  accessibilityLabel={`Edit ${focus.title}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: pending }}
                  disabled={pending}
                  onPress={() => setEditing(focus)}
                  style={[styles.manageActionTouch, pending && styles.disabled]}
                >
                  <Text style={styles.join}>Edit</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Remove ${focus.title}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: pending }}
                  disabled={pending}
                  onPress={() => onRemove(focus.focusuuid, focus.title)}
                  style={[styles.manageActionTouch, pending && styles.disabled]}
                >
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.empty}>No prayer focuses yet.</Text>
      )}
      <InlineError
        message={focuses.map((focus) => getError(focus.focusuuid)).find(Boolean)}
      />
      <PrayerFocusModal
        visible={editing !== null}
        focus={editing}
        saving={editing ? isPending(editing.focusuuid) : false}
        error={editing ? getError(editing.focusuuid) : undefined}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          if (!editing) return;
          const saved = await onSave(editing, input);
          if (saved) setEditing(null);
        }}
      />
    </Section>
  );
}
