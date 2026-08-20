import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";
import {
  formatTrialRemaining,
  type PersonalPlan,
} from "../../types/home";

export function PersonalPlanDrawer({
  visible,
  plan,
  pending,
  error,
  onClose,
  onStartTrial,
  onSubscribePlaceholder,
}: {
  visible: boolean;
  plan: PersonalPlan | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onStartTrial: () => Promise<void>;
  onSubscribePlaceholder: () => Promise<void>;
}) {
  const styles = useThemedStyles(createStyles);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!visible || plan?.status !== "trial") return;
    const id = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [plan?.status, visible]);

  const remaining = formatTrialRemaining(plan?.trialEndsAt);
  const title =
    plan?.status === "sponsored"
      ? "Covered by your church"
      : plan?.status === "pro"
        ? "ChiRho Personal"
        : plan?.status === "trial"
          ? "Your free week"
          : "Keep your prayer cards";
  const body =
    plan?.status === "sponsored"
      ? `${plan.sponsoredByName || "Your church"} includes ChiRho Personal while you are a member.`
      : plan?.status === "pro"
        ? `You're on Pro. ${plan.priceLabel} is a placeholder until Apple Pay and Stripe.`
        : plan?.status === "trial"
          ? remaining || "Your free week is active."
          : plan?.canStartTrial
            ? "Your church no longer covers ChiRho Personal. Start a free week, or continue on your own."
            : "Your free week has ended. Continue with Pro to keep loved ones, daily cards, and focuses.";

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.handle} />
        <Text style={styles.eyebrow}>CHIRHO PERSONAL</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {plan?.canStartTrial ? (
          <Pressable
            accessibilityRole="button"
            disabled={pending}
            onPress={() => {
              void onStartTrial();
            }}
            style={[styles.submit, pending && styles.disabled]}
          >
            <Text style={styles.submitText}>
              {pending ? "Starting…" : "Start 7-day free trial"}
            </Text>
          </Pressable>
        ) : null}

        {plan && plan.status !== "sponsored" && plan.status !== "pro" ? (
          <Pressable
            accessibilityRole="button"
            disabled={pending}
            onPress={() => {
              void onSubscribePlaceholder();
            }}
            style={[
              plan.canStartTrial ? styles.secondary : styles.submit,
              pending && styles.disabled,
            ]}
          >
            <Text
              style={
                plan.canStartTrial ? styles.secondaryText : styles.submitText
              }
            >
              {pending
                ? "Updating…"
                : `Continue with Pro · ${plan.priceLabel}`}
            </Text>
          </Pressable>
        ) : null}

        {plan?.status === "pro" || plan?.status === "sponsored" ? (
          <Pressable
            accessibilityRole="button"
            disabled={pending}
            onPress={onClose}
            style={styles.submit}
          >
            <Text style={styles.submitText}>Done</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={pending}
            onPress={onClose}
            style={styles.cancel}
          >
            <Text style={styles.cancelText}>Stay on Free</Text>
          </Pressable>
        )}

        <Text style={styles.footnote}>
          Fake payment for now. This syncs with chirho.ai/admin/account. Stripe
          and Apple In-App Purchase come later.
        </Text>
      </ScrollView>
    </Modal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    content: { padding: 24, paddingBottom: 48, backgroundColor: colors.canvas },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.glassBorderStrong,
      marginBottom: 36,
    },
    eyebrow: {
      color: colors.accentText,
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      letterSpacing: 1,
      marginBottom: 10,
    },
    title: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 34,
      letterSpacing: -0.8,
      marginBottom: 14,
    },
    body: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 28,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 13,
      marginBottom: 16,
    },
    submit: {
      width: "100%",
      paddingVertical: 14,
      backgroundColor: colors.buttonPrimary,
      borderRadius: 18,
      alignItems: "center",
      marginBottom: 12,
    },
    submitText: {
      color: colors.buttonOnPrimary,
      fontFamily: fonts.displayMedium,
      fontSize: 14,
    },
    secondary: {
      width: "100%",
      paddingVertical: 14,
      borderRadius: 18,
      alignItems: "center",
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.glassBorderStrong,
    },
    secondaryText: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 14,
    },
    cancel: {
      alignItems: "center",
      paddingVertical: 12,
    },
    cancelText: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 14,
    },
    disabled: { opacity: 0.4 },
    footnote: {
      color: colors.mutedSoft,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 20,
    },
  });
}
