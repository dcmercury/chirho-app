import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, fonts } from "../../theme/tokens";
import type {
  PrayerFocus,
  PrayerFocusInput,
  PrayerFocusPeriod,
  PrayerFocusType,
} from "../../types/home";
import { PrayerFocusTypeIcon } from "./PrayerFocusTypeIcon";

const categories = [
  { value: "general", label: "General" },
  { value: "health", label: "Health" },
  { value: "family", label: "Family" },
  { value: "work", label: "Work" },
  { value: "finances", label: "Finances" },
  { value: "peace", label: "Peace" },
  { value: "guidance", label: "Guidance" },
  { value: "healing", label: "Healing" },
  { value: "relationships", label: "Relationships" },
  { value: "faith", label: "Faith" },
];

const focusTypes: { value: PrayerFocusType; label: string }[] = [
  { value: "church", label: "Church" },
  { value: "pet", label: "Pet" },
  { value: "health", label: "Health" },
  { value: "situation", label: "Situation" },
  { value: "other", label: "Other" },
];

const periods: { value: PrayerFocusPeriod; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "both", label: "Both" },
];

export function PrayerFocusModal({
  visible,
  focus,
  saving,
  error,
  nextOrder = 0,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  focus: PrayerFocus | null;
  saving: boolean;
  error?: string | null;
  nextOrder?: number;
  onClose: () => void;
  onSubmit: (input: PrayerFocusInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<PrayerFocusType>("other");
  const [note, setNote] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [period, setPeriod] = useState<PrayerFocusPeriod>("both");

  useEffect(() => {
    if (!visible) return;
    setTitle(focus?.title || "");
    setType(focus?.type || "other");
    setNote(focus?.note || "");
    setSelectedCategories(focus ? focus.categories : ["general"]);
    setPeriod(focus?.period || "both");
  }, [focus, visible]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>DAILY PRAYER DECK</Text>
          <Text style={styles.title}>
            {focus ? "Edit prayer focus" : "Add prayer focus"}
          </Text>
          <TextInput
            accessibilityLabel="Prayer focus title"
            autoFocus
            editable={!saving}
            onChangeText={setTitle}
            placeholder="Who or what are you praying for?"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={title}
          />

          <Text style={styles.label}>TYPE</Text>
          <View style={styles.typeRow}>
            {focusTypes.map((option) => {
              const active = option.value === type;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: saving }}
                  disabled={saving}
                  onPress={() => setType(option.value)}
                  style={[styles.typeOption, active && styles.optionActive]}
                >
                  <PrayerFocusTypeIcon
                    type={option.value}
                    color={active ? colors.accent : colors.mutedSoft}
                    size={18}
                  />
                  <Text style={[styles.typeText, active && styles.optionTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>NOTE OR INTENTION (OPTIONAL)</Text>
          <TextInput
            accessibilityLabel="Prayer focus note or intention"
            editable={!saving}
            multiline
            onChangeText={setNote}
            placeholder="Add a little context for the prayer"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.noteInput]}
            textAlignVertical="top"
            value={note}
          />

          <Text style={styles.label}>CATEGORIES</Text>
          <View style={styles.tags}>
            {categories.map((category) => {
              const active = selectedCategories.includes(category.value);
              return (
                <Pressable
                  key={category.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: saving }}
                  disabled={saving}
                  onPress={() => toggleCategory(category.value)}
                  style={[styles.tag, active && styles.optionActive]}
                >
                  <Text style={[styles.tagText, active && styles.optionTextActive]}>
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, styles.periodLabel]}>PRAY DURING</Text>
          <View style={styles.periodRow}>
            {periods.map((option) => {
              const active = option.value === period;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: saving }}
                  disabled={saving}
                  onPress={() => setPeriod(option.value)}
                  style={[styles.periodOption, active && styles.optionActive]}
                >
                  <Text style={[styles.tagText, active && styles.optionTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !title.trim() || saving }}
            disabled={!title.trim() || saving}
            onPress={() =>
              onSubmit({
                title: title.trim(),
                type,
                note: note.trim() || null,
                categories: selectedCategories,
                virtues: focus?.virtues || [],
                period,
                active: focus?.active ?? true,
                order: focus?.order ?? nextOrder,
              })
            }
            style={[styles.submit, (!title.trim() || saving) && styles.disabled]}
          >
            <Text style={styles.submitText}>
              {saving ? "Saving…" : focus ? "Save changes" : "Add focus"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={onClose}
            style={styles.cancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 24, paddingBottom: 48 },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorderStrong,
    marginBottom: 36,
  },
  eyebrow: {
    color: colors.accent,
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 34,
    letterSpacing: -0.8,
    marginBottom: 26,
  },
  input: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  noteInput: { minHeight: 94, paddingTop: 14 },
  label: {
    color: colors.muted,
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  typeOption: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 13,
  },
  typeText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 11 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 13,
  },
  tagText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 12 },
  optionActive: {
    backgroundColor: "rgba(249,115,22,0.14)",
    borderColor: "rgba(249,115,22,0.45)",
  },
  optionTextActive: { color: colors.accent },
  periodLabel: { marginTop: 24 },
  periodRow: { flexDirection: "row", gap: 8 },
  periodOption: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 16,
  },
  submit: {
    minHeight: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    marginTop: 28,
  },
  submitText: {
    color: colors.black,
    fontFamily: fonts.displayMedium,
    fontSize: 15,
  },
  cancel: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  cancelText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 13 },
  disabled: { opacity: 0.35 },
});
