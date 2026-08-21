import { useEffect, useMemo, useState } from "react";
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
import { useThemedStyles } from "../../theme/ThemeProvider";
import { generateDailyPrayers, saveLovedOneConfig } from "../../lib/api";
import {
  PRAYER_CATEGORIES,
  PRAYER_VIRTUES,
  prayerCategoryLabel,
} from "../../lib/prayerConfig";
import type { HomeProfile } from "../../types/home";

type DailyStep = "people" | "categories" | "virtues" | "when" | "preview";
type TimeChoice = "morning" | "evening" | "both";

const STEP_DOTS: DailyStep[] = [
  "people",
  "categories",
  "virtues",
  "when",
  "preview",
];

interface PersonDraft {
  categories: string[];
  virtues: Record<string, string[]>;
}

interface GeneratedPrayer {
  timeOfDay: TimeChoice | "morning" | "evening";
  title: string;
  text: string;
}

function emptyDraft(): PersonDraft {
  return { categories: [], virtues: {} };
}

export function DailyPrayerDrawer({
  visible,
  lovedOnes,
  onClose,
  onComplete,
}: {
  visible: boolean;
  lovedOnes: HomeProfile["managedLovedOnes"];
  onClose: () => void;
  onComplete: () => Promise<void> | void;
}) {
  const styles = useThemedStyles(createStyles);
  const { getToken } = useAuth();
  const [step, setStep] = useState<DailyStep>("people");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [personIndex, setPersonIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, PersonDraft>>({});
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState<TimeChoice | null>(null);
  const [prayers, setPrayers] = useState<GeneratedPrayer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setStep("people");
      setSelectedIds([]);
      setPersonIndex(0);
      setDrafts({});
      setCategoryIndex(0);
      setTimeOfDay(null);
      setPrayers([]);
      setBusy(false);
      setError(null);
    }
  }, [visible]);

  const selectedPeople = useMemo(
    () => lovedOnes.filter((person) => selectedIds.includes(person.id)),
    [lovedOnes, selectedIds],
  );
  const currentPerson = selectedPeople[personIndex];
  const currentDraft = currentPerson
    ? drafts[currentPerson.id] || emptyDraft()
    : emptyDraft();
  const currentCategory = currentDraft.categories[categoryIndex];
  const currentVirtues = currentDraft.virtues[currentCategory] || [];

  const togglePerson = (id: string) => {
    setError(null);
    setSelectedIds((current) => {
      if (current.includes(id)) {
        setDrafts((draftsState) => {
          const next = { ...draftsState };
          delete next[id];
          return next;
        });
        return current.filter((item) => item !== id);
      }
      if (current.length >= 5) return current;
      const person = lovedOnes.find((item) => item.id === id);
      setDrafts((draftsState) => ({
        ...draftsState,
        [id]: {
          categories: person?.categories || [],
          virtues: {},
        },
      }));
      return [...current, id];
    });
  };

  const updateDraft = (id: string, next: PersonDraft) => {
    setDrafts((current) => ({ ...current, [id]: next }));
  };

  const toggleCategory = (category: string) => {
    if (!currentPerson) return;
    const categories = currentDraft.categories.includes(category)
      ? currentDraft.categories.filter((item) => item !== category)
      : [...currentDraft.categories, category];
    const virtues = { ...currentDraft.virtues };
    if (!categories.includes(category)) delete virtues[category];
    updateDraft(currentPerson.id, { categories, virtues });
  };

  const toggleVirtue = (virtue: string) => {
    if (!currentPerson || !currentCategory) return;
    const virtues = currentVirtues.includes(virtue)
      ? currentVirtues.filter((item) => item !== virtue)
      : [...currentVirtues, virtue];
    updateDraft(currentPerson.id, {
      ...currentDraft,
      virtues: { ...currentDraft.virtues, [currentCategory]: virtues },
    });
  };

  const jumpTo = (target: DailyStep) => {
    if (busy || target === step) return;
    setError(null);
    if (target === "virtues") setCategoryIndex(0);
    setStep(target);
  };

  const goBack = () => {
    setError(null);
    if (step === "people") {
      onClose();
      return;
    }
    if (step === "categories") {
      if (personIndex > 0) {
        const previous = selectedPeople[personIndex - 1];
        setPersonIndex((index) => index - 1);
        setCategoryIndex(Math.max(0, (drafts[previous.id]?.categories.length || 1) - 1));
        setStep("virtues");
        return;
      }
      setStep("people");
      return;
    }
    if (step === "virtues") {
      if (categoryIndex > 0) {
        setCategoryIndex((index) => index - 1);
        return;
      }
      setStep("categories");
      return;
    }
    if (step === "when") {
      const last = selectedPeople[selectedPeople.length - 1];
      setPersonIndex(Math.max(0, selectedPeople.length - 1));
      setCategoryIndex(Math.max(0, (drafts[last?.id]?.categories.length || 1) - 1));
      setStep("virtues");
      return;
    }
    setStep("when");
  };

  const continueFromPeople = () => {
    if (!selectedPeople.length) {
      setError("Pick at least one loved one.");
      return;
    }
    setError(null);
    setPersonIndex(0);
    setCategoryIndex(0);
    setStep("categories");
  };

  const continueFromCategories = () => {
    if (!currentDraft.categories.length) {
      setError("Pick at least one area of life.");
      return;
    }
    setError(null);
    setCategoryIndex(0);
    setStep("virtues");
  };

  const continueFromVirtues = () => {
    if (!currentVirtues.length) {
      setError(`Pick at least one virtue for ${prayerCategoryLabel(currentCategory)}.`);
      return;
    }
    setError(null);
    if (categoryIndex < currentDraft.categories.length - 1) {
      setCategoryIndex((index) => index + 1);
      return;
    }
    if (personIndex < selectedPeople.length - 1) {
      setPersonIndex((index) => index + 1);
      setCategoryIndex(0);
      setStep("categories");
      return;
    }
    setStep("when");
  };

  const generate = async (choice: TimeChoice) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setTimeOfDay(choice);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const lovedOnesConfig = selectedPeople.map((person) => {
        const draft = drafts[person.id] || emptyDraft();
        const virtues = [
          ...new Set(Object.values(draft.virtues).flat()),
        ];
        return {
          name: person.firstName,
          categories: draft.categories,
          virtues,
        };
      });
      await Promise.all(
        selectedPeople.map((person) => {
          const draft = drafts[person.id] || emptyDraft();
          return saveLovedOneConfig(
            person.id,
            draft.categories
              .filter((category) => (draft.virtues[category] || []).length)
              .map((category) => ({
                category,
                virtues: draft.virtues[category],
              })),
            token,
          );
        }),
      );
      const result = await generateDailyPrayers(choice, lovedOnesConfig, token);
      setPrayers(result);
      setStep("preview");
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Unable to write this prayer. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    await onComplete();
    onClose();
  };

  const title =
    step === "people"
      ? "Who should this prayer hold?"
      : step === "categories"
        ? `Which areas of life for ${currentPerson?.firstName || "them"}?`
        : step === "virtues"
          ? `Which virtues for ${currentPerson?.firstName || "them"}'s ${prayerCategoryLabel(currentCategory)}?`
          : step === "when"
            ? "When would you like to pray?"
            : timeOfDay === "both"
              ? "Your daily prayers"
              : timeOfDay === "evening"
                ? "Your evening prayer"
                : "Your morning prayer";

  const subtitle =
    step === "people"
      ? "Choose up to five loved ones. AI will write from what you pick."
      : step === "categories"
        ? "Tap the parts of life you’d like to pray for."
        : step === "virtues"
          ? "AI will write prayers from the virtues you pick."
          : step === "when"
            ? "Choose morning, evening, or both."
            : "This is now set as your daily prayer.";

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
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.handle} />
            <Text style={styles.eyebrow}>DAILY PRAYER</Text>
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
            {step !== "people" ? (
              <View style={styles.crumbs}>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => jumpTo("people")}
                  style={[styles.crumbTouch, styles.crumbItemEarly]}
                >
                  <Text style={styles.crumb} numberOfLines={1}>
                    {selectedPeople.map((person) => person.firstName).join(", ") ||
                      "Loved ones"}
                  </Text>
                </Pressable>
                {step === "virtues" || step === "when" || step === "preview" ? (
                  <>
                    <Text style={styles.crumbSep}>→</Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => jumpTo("categories")}
                      style={[
                        styles.crumbTouch,
                        step === "virtues"
                          ? styles.crumbItemLast
                          : styles.crumbItemEarly,
                      ]}
                    >
                      <Text style={styles.crumb} numberOfLines={1}>
                        {currentPerson?.firstName || "Areas"}
                      </Text>
                    </Pressable>
                  </>
                ) : null}
                {step === "when" || step === "preview" ? (
                  <>
                    <Text style={styles.crumbSep}>→</Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => jumpTo("when")}
                      style={[styles.crumbTouch, styles.crumbItemLast]}
                    >
                      <Text style={styles.crumb}>When</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            ) : null}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {step === "people" ? (
              lovedOnes.length ? (
                <View style={styles.people}>
                  {lovedOnes.map((person) => {
                    const active = selectedIds.includes(person.id);
                    return (
                      <Pressable
                        key={person.id}
                        disabled={busy}
                        onPress={() => togglePerson(person.id)}
                        style={[styles.personRow, active && styles.personRowActive]}
                      >
                        <View
                          style={[styles.radio, active && styles.radioActive]}
                        >
                          {active ? <View style={styles.radioDot} /> : null}
                        </View>
                        <View style={styles.personCopy}>
                          <Text style={styles.personName}>{person.firstName}</Text>
                          <Text style={styles.personMeta}>
                            {person.categories.length
                              ? person.categories.map(prayerCategoryLabel).join(", ")
                              : "No areas yet"}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.empty}>
                  Add a loved one first, then come back to set morning and evening
                  prayer.
                </Text>
              )
            ) : null}

            {step === "categories" ? (
              <View style={styles.tags}>
                {PRAYER_CATEGORIES.map((category) => {
                  const active = currentDraft.categories.includes(category.id);
                  return (
                    <Pressable
                      key={category.id}
                      disabled={busy}
                      onPress={() => toggleCategory(category.id)}
                      style={[styles.tag, active && styles.tagActive]}
                    >
                      <Text
                        style={[styles.tagText, active && styles.tagTextActive]}
                      >
                        {category.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {step === "virtues" ? (
              <View style={styles.tags}>
                {PRAYER_VIRTUES.map((virtue) => {
                  const active = currentVirtues.includes(virtue.id);
                  return (
                    <Pressable
                      key={virtue.id}
                      disabled={busy}
                      onPress={() => toggleVirtue(virtue.id)}
                      style={[styles.tag, active && styles.tagActive]}
                    >
                      <Text
                        style={[styles.tagText, active && styles.tagTextActive]}
                      >
                        {virtue.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {step === "when" ? (
              <View style={styles.whenList}>
                {(
                  [
                    { id: "morning", label: "Morning" },
                    { id: "evening", label: "Evening" },
                    { id: "both", label: "Both" },
                  ] as const
                ).map((option) => (
                  <Pressable
                    key={option.id}
                    disabled={busy}
                    onPress={() => void generate(option.id)}
                    style={[
                      styles.whenRow,
                      timeOfDay === option.id && styles.whenRowActive,
                      busy && styles.disabled,
                    ]}
                  >
                    <View
                      style={[
                        styles.radio,
                        timeOfDay === option.id && styles.radioActive,
                      ]}
                    >
                      {timeOfDay === option.id ? (
                        <View style={styles.radioDot} />
                      ) : null}
                    </View>
                    <Text style={styles.whenLabel}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {step === "preview" ? (
              <View style={styles.preview}>
                {prayers.map((prayer, index) => (
                  <View
                    key={`${prayer.timeOfDay}-${index}`}
                    style={[
                      styles.previewCard,
                      index === prayers.length - 1 && styles.previewCardLast,
                    ]}
                  >
                    <Text style={styles.previewLabel}>
                      {prayer.timeOfDay === "evening"
                        ? "EVENING"
                        : prayer.timeOfDay === "morning"
                          ? "MORNING"
                          : "PRAYER"}
                    </Text>
                    <Text style={styles.previewTitle}>{prayer.title}</Text>
                    <Text style={styles.previewText}>{prayer.text}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {step === "people" && lovedOnes.length ? (
              <Pressable
                disabled={busy || !selectedIds.length}
                onPress={continueFromPeople}
                style={[
                  styles.submit,
                  (!selectedIds.length || busy) && styles.disabled,
                ]}
              >
                <Text style={styles.submitText}>Continue</Text>
              </Pressable>
            ) : null}

            {step === "categories" ? (
              <Pressable
                disabled={busy}
                onPress={continueFromCategories}
                style={[
                  styles.submit,
                  !currentDraft.categories.length && styles.disabled,
                ]}
              >
                <Text style={styles.submitText}>Continue</Text>
              </Pressable>
            ) : null}

            {step === "virtues" ? (
              <Pressable
                disabled={busy}
                onPress={continueFromVirtues}
                style={[styles.submit, !currentVirtues.length && styles.disabled]}
              >
                <Text style={styles.submitText}>
                  {categoryIndex < currentDraft.categories.length - 1
                    ? "Next area"
                    : personIndex < selectedPeople.length - 1
                      ? `Next: ${selectedPeople[personIndex + 1]?.firstName || "loved one"}`
                      : "Choose time"}
                </Text>
              </Pressable>
            ) : null}

            {step === "when" ? (
              <Text style={styles.generating}>
                {busy ? "Writing your prayer…" : "Tap a time to generate."}
              </Text>
            ) : null}

            {step === "preview" ? (
              <Pressable
                disabled={busy}
                onPress={() => void finish()}
                style={styles.submit}
              >
                <Text style={styles.submitText}>Done</Text>
              </Pressable>
            ) : null}

            <View style={styles.actions}>
              {step !== "people" ? (
                <Pressable
                  disabled={busy}
                  onPress={goBack}
                  style={[
                    styles.secondary,
                    styles.backButton,
                    busy && styles.disabled,
                  ]}
                >
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
              ) : null}
              <Pressable
                disabled={busy}
                onPress={onClose}
                style={[styles.secondary, busy && styles.disabled]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </ScrollView>
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
    dotReached: { backgroundColor: colors.accent },
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
    crumbItemEarly: { flexShrink: 1, flexGrow: 0, minWidth: 0 },
    crumbItemLast: { flexShrink: 0 },
    crumbTouch: { minHeight: 28, minWidth: 0, justifyContent: "center" },
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
    people: { gap: 8 },
    personRow: {
      minHeight: 56,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glassFill,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    personRowActive: {
      borderColor: colors.accentBorderPill,
      backgroundColor: colors.accentFillPill,
    },
    personCopy: { flex: 1, minWidth: 0 },
    personName: {
      color: colors.title,
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
    },
    personMeta: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 10,
      marginTop: 2,
    },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.glassBorderLoud,
      alignItems: "center",
      justifyContent: "center",
    },
    radioActive: { borderColor: colors.accent },
    radioDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
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
    whenList: { gap: 8 },
    whenRow: {
      minHeight: 52,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glassFill,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    whenRowActive: {
      borderColor: colors.accentBorderPill,
      backgroundColor: colors.accentFillPill,
    },
    whenLabel: {
      color: colors.title,
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
    },
    generating: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      marginTop: 16,
    },
    preview: { gap: 14 },
    previewCard: {
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorderSoft,
    },
    previewCardLast: { borderBottomWidth: 0, paddingBottom: 0 },
    previewLabel: {
      ...typography.labelSm,
      color: colors.accentText,
      marginBottom: 6,
    },
    previewTitle: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 16,
      marginBottom: 8,
    },
    previewText: {
      color: colors.mutedStrong,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
    },
    empty: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 11,
      marginTop: 12,
    },
    submit: {
      minHeight: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.buttonPrimary,
      marginTop: 24,
    },
    submitText: {
      color: colors.buttonOnPrimary,
      fontFamily: fonts.displayMedium,
      fontSize: 14,
    },
    actions: { flexDirection: "row", gap: 8, marginTop: 12 },
    secondary: {
      flex: 1,
      minHeight: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.glassBorderLoud,
      alignItems: "center",
      justifyContent: "center",
    },
    backButton: {
      borderColor: colors.accentBorderPill,
      backgroundColor: colors.accentFillPill,
    },
    backText: {
      color: colors.accentText,
      fontFamily: fonts.displayMedium,
      fontSize: 12,
    },
    cancelText: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 12,
    },
    disabled: { opacity: 0.4 },
  });
}
