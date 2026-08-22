import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@clerk/expo";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { fonts, type as typography, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { generateNeedPrayer } from "../../lib/api";
import { BackIcon, CloseIcon } from "../../features/groups/components/Icons";
import {
  PRAYER_NEED_BURDENS,
  PRAYER_NEED_OPTIONS,
  prayerNeedBurdenLabel,
} from "../../lib/prayerNeedFlow";
import type { HomePrayerCard } from "../../types/home";
import { Stagger } from "../../features/groups/components/Stagger";
import { WizardBackdrop } from "../ui/WizardBackdrop";
import { LoadingChiRhoOverlay } from "../ui/LoadingChiRhoOverlay";

type NeedStep = "burden" | "option" | "confirm";

const STEP_DOTS: NeedStep[] = ["burden", "option", "confirm"];

/**
 * Praying for someone else is handled by the Person path on the home rail, so
 * this wizard is always first-person. The backend still requires the field and
 * uses it to pick the prayer's pronouns.
 */
const NEED_PATH = "myself" as const;

export type NeedPrayerMode = "prayer" | "situation";

export function NeedPrayerDrawer({
  visible,
  mode = "prayer",
  traditionId,
  traditionLabel,
  onClose,
  onGenerated,
  onSaveSituation,
}: {
  visible: boolean;
  mode?: NeedPrayerMode;
  traditionId: string;
  traditionLabel: string;
  onClose: () => void;
  onGenerated: (card: HomePrayerCard) => void;
  onSaveSituation?: (situation: {
    title: string;
    burdenId: string;
    optionId: string;
  }) => Promise<void>;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const [step, setStep] = useState<NeedStep>("burden");
  const [burdenId, setBurdenId] = useState<string | null>(null);
  const [optionId, setOptionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionSet = burdenId ? PRAYER_NEED_OPTIONS[burdenId] : null;
  const optionLabel =
    optionSet?.buttons.find((item) => item.id === optionId)?.label || "";
  const burdenLabel = burdenId ? prayerNeedBurdenLabel(burdenId) : "";

  useEffect(() => {
    if (!visible) {
      setStep("burden");
      setBurdenId(null);
      setOptionId(null);
      setBusy(false);
      setError(null);
    }
  }, [visible]);

  const jumpTo = (target: NeedStep) => {
    if (busy || target === step) return;
    setError(null);
    setStep(target);
  };

  const goBack = () => {
    if (busy) return;
    setError(null);
    if (step === "burden") {
      onClose();
      return;
    }
    if (step === "option") {
      setStep("burden");
      return;
    }
    setStep("option");
  };

  const chooseBurden = (next: string) => {
    setBurdenId(next);
    setOptionId(null);
    setError(null);
    setStep("option");
  };

  const chooseOption = (next: string) => {
    setOptionId(next);
    setError(null);
    setStep("confirm");
  };

  const saveSituation = async () => {
    if (busy || !burdenId || !optionId || !onSaveSituation) return;
    setBusy(true);
    setError(null);
    try {
      await onSaveSituation({
        title: `${burdenLabel} — ${optionLabel}`,
        burdenId,
        optionId,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save this situation.",
      );
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (busy || !burdenId || !optionId) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const card = await generateNeedPrayer(
        {
          path: NEED_PATH,
          burden: burdenLabel,
          burdenId,
          burdenOption: optionLabel,
          burdenOptionId: optionId,
          tradition: traditionLabel,
          traditionId: traditionId || "scripture",
        },
        token,
      );
      onGenerated(card);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to generate this prayer.",
      );
    } finally {
      setBusy(false);
    }
  };

  const isSituation = mode === "situation";

  const title =
    step === "burden"
      ? "What burden are you carrying?"
      : step === "option"
        ? optionSet?.title || "What kind of prayer do you need?"
        : isSituation
          ? "Ready to add"
          : "Ready to pray";

  const subtitle =
    step === "burden"
      ? isSituation
        ? "This becomes part of your daily prayers."
        : "Tap the burden this prayer should hold."
      : step === "option"
        ? "Choose the shape of that need."
        : isSituation
          ? "We will hold this for you every day."
          : `Shaped by your ${traditionLabel} tradition.`;

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.root}
        >
          <WizardBackdrop />
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.handle} />
            <Text style={styles.eyebrow}>PRAYER</Text>
            <View style={styles.dots}>
              {STEP_DOTS.map((item, index) => {
                const currentIndex = STEP_DOTS.indexOf(step);
                const reached = index <= currentIndex;
                return (
                  <Pressable
                    key={item}
                    accessibilityLabel={`Step ${index + 1}`}
                    accessibilityRole="button"
                    disabled={!reached || item === step || busy}
                    hitSlop={8}
                    onPress={() => {
                      if (index < currentIndex) jumpTo(item);
                    }}
                    style={[
                      styles.dot,
                      reached && styles.dotReached,
                      item === step && styles.dotActive,
                    ]}
                  />
                );
              })}
            </View>
            {step !== "burden" ? (
              <View style={styles.crumbs}>
                {step === "option" || step === "confirm" ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => jumpTo("burden")}
                    style={[
                      styles.crumbTouch,
                      step === "confirm"
                        ? styles.crumbItemEarly
                        : styles.crumbItemLast,
                    ]}
                  >
                    <Text style={styles.crumb} numberOfLines={1}>
                      {burdenLabel || "Burden"}
                    </Text>
                  </Pressable>
                ) : null}
                {step === "confirm" ? (
                  <>
                    <Text style={styles.crumbSep}>→</Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => jumpTo("option")}
                      style={[styles.crumbTouch, styles.crumbItemLast]}
                    >
                      <Text style={styles.crumb} numberOfLines={1}>
                        {optionLabel || "Need"}
                      </Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            ) : null}
            <View key={step}>
              <Stagger delay={80}>
                <Text style={styles.title}>{title}</Text>
              </Stagger>
              <Stagger delay={180}>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </Stagger>
              <Stagger delay={280}>
                {step === "burden" ? (
                  <View style={styles.tags}>
                    {PRAYER_NEED_BURDENS.map((item) => (
                      <Pressable
                        key={item.id}
                        disabled={busy}
                        onPress={() => chooseBurden(item.id)}
                        style={[
                          styles.tag,
                          burdenId === item.id && styles.tagActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            burdenId === item.id && styles.tagTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {step === "option" && optionSet ? (
                  <View style={styles.tags}>
                    {optionSet.buttons.map((item) => (
                      <Pressable
                        key={item.id}
                        disabled={busy}
                        onPress={() => chooseOption(item.id)}
                        style={[
                          styles.tag,
                          optionId === item.id && styles.tagActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            optionId === item.id && styles.tagTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {step === "confirm" ? (
                  <View style={styles.review}>
                    <Text style={styles.reviewText}>
                      We will be praying for your {burdenLabel.toLowerCase()} of{" "}
                      {optionLabel.toLowerCase()}.
                    </Text>
                  </View>
                ) : null}

                {error ? <Text style={styles.error}>{error}</Text> : null}
              </Stagger>
            </View>

            <View style={styles.actions}>
              <View style={styles.actionCircles}>
                {step !== "burden" ? (
                  <Pressable
                    accessibilityLabel="Back"
                    accessibilityRole="button"
                    disabled={busy}
                    hitSlop={8}
                    onPress={goBack}
                    style={[
                      styles.circle,
                      styles.backCircle,
                      busy && styles.disabled,
                    ]}
                  >
                    <BackIcon color={colors.accent} size={14} />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                  disabled={busy}
                  hitSlop={8}
                  onPress={onClose}
                  style={[styles.circle, busy && styles.disabled]}
                >
                  <CloseIcon color={colors.mutedStrong} size={14} />
                </Pressable>
              </View>
              {step === "confirm" ? (
                <Pressable
                  accessibilityLabel={isSituation ? "Add to my prayers" : "Pray"}
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() =>
                    void (isSituation ? saveSituation() : generate())
                  }
                  style={[styles.submit, busy && styles.disabled]}
                >
                  <Text style={styles.submitText}>
                    {busy
                      ? isSituation
                        ? "Saving…"
                        : "Writing…"
                      : isSituation
                        ? "Add to my prayers"
                        : "Pray"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
          <LoadingChiRhoOverlay
            visible={busy}
            label={isSituation ? "Adding to your prayers…" : "Writing your prayer…"}
          />
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: 24, paddingBottom: 64 },
    handle: {
      alignSelf: "center",
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.glassBorderStrong,
      marginBottom: 24,
    },
    eyebrow: {
      ...typography.labelSm,
      color: colors.muted,
      marginBottom: 10,
    },
    dots: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 12,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.glassBorderStrong,
    },
    dotReached: {
      backgroundColor: colors.accent,
    },
    dotActive: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    crumbs: {
      flexDirection: "row",
      flexWrap: "nowrap",
      alignItems: "center",
      marginBottom: 16,
    },
    crumbItemEarly: {
      flexShrink: 1,
      flexGrow: 0,
      minWidth: 0,
    },
    crumbItemLast: {
      flexShrink: 0,
    },
    crumbTouch: {
      minHeight: 28,
      minWidth: 0,
      justifyContent: "center",
    },
    crumb: {
      color: colors.accentText,
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      flexShrink: 1,
    },
    crumbSep: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      marginHorizontal: 6,
      flexShrink: 0,
    },
    title: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 27,
      marginBottom: 3,
    },
    subtitle: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 16,
      marginBottom: 24,
    },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    tag: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tagActive: {
      backgroundColor: colors.accentFillPill,
      borderColor: colors.accentBorderPill,
    },
    tagText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 11 },
    tagTextActive: { color: colors.accentText },
    review: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.glassBorder,
      paddingVertical: 16,
    },
    reviewText: {
      color: colors.title,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 11,
      marginTop: 12,
    },
    submit: {
      height: 36,
      paddingHorizontal: 18,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.buttonPrimary,
    },
    submitText: {
      color: colors.buttonOnPrimary,
      fontFamily: fonts.displayMedium,
      fontSize: 12,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 12,
    },
    actionCircles: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    circle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: colors.glassBorderStrong,
      backgroundColor: colors.glassFill,
      alignItems: "center",
      justifyContent: "center",
    },
    backCircle: {
      borderColor: colors.accentBorderSelected,
      backgroundColor: colors.accentFillSelected,
    },
    disabled: { opacity: 0.45 },
  });
}
