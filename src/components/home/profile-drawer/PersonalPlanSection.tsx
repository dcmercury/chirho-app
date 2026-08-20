import { Pressable, Text, View } from "react-native";
import {
  formatTrialRemaining,
  type PersonalPlan,
} from "../../../types/home";
import { Section, useProfileStyles } from "./ProfileControls";

function planSummary(plan: PersonalPlan | null) {
  if (!plan) return "Manage ChiRho Personal";
  if (plan.status === "sponsored") {
    return plan.sponsoredByName
      ? `Covered by ${plan.sponsoredByName}`
      : "Covered by your church";
  }
  if (plan.status === "pro") return `Pro · ${plan.priceLabel} placeholder`;
  if (plan.status === "trial") {
    return formatTrialRemaining(plan.trialEndsAt) || "Free week";
  }
  return plan.canStartTrial ? "Free · start a 7-day trial" : "Free week ended";
}

export function PersonalPlanSection({
  plan,
  onOpen,
}: {
  plan: PersonalPlan | null;
  onOpen: () => void;
}) {
  const styles = useProfileStyles();
  return (
    <Section title="ChiRho Personal">
      <Pressable
        accessibilityHint="Opens your personal plan choices"
        accessibilityLabel="Manage ChiRho Personal"
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.manageRow,
          pressed && styles.accountSummaryPressed,
        ]}
      >
        <View style={styles.accountSummaryCopy}>
          <Text style={styles.accountSummaryName}>
            {plan?.status === "pro"
              ? "Pro"
              : plan?.status === "trial"
                ? "Free week"
                : plan?.status === "sponsored"
                  ? "Covered"
                  : "Free"}
          </Text>
          <Text style={styles.accountSummaryContact}>{planSummary(plan)}</Text>
        </View>
        <View style={[styles.accountCaret, styles.caretForward]} />
      </Pressable>
    </Section>
  );
}
