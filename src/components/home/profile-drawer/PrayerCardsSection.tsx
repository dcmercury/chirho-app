import { Pressable, Text, View } from "react-native";
import { Section, useProfileStyles } from "./ProfileControls";

export function PrayerCardsSection({
  count,
  onOpen,
}: {
  count: string;
  onOpen: () => void;
}) {
  const styles = useProfileStyles();
  const label = Number(count) === 1 ? "1 prayer card" : `${count} prayer cards`;

  return (
    <Section title="Prayer cards">
      <Pressable
        accessibilityHint="Opens a drawer to view and delete your prayer cards"
        accessibilityLabel={`View ${label}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.manageRow,
          pressed && styles.accountSummaryPressed,
        ]}
      >
        <View style={styles.accountSummaryCopy}>
          <Text style={styles.accountSummaryName}>{label}</Text>
          <Text style={styles.accountSummaryContact}>
            View, listen, and delete
          </Text>
        </View>
        <View style={[styles.accountCaret, styles.caretForward]} />
      </Pressable>
    </Section>
  );
}
