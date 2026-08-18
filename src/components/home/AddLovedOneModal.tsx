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

const categories = [
  "Health",
  "Family",
  "Work",
  "Finances",
  "Peace",
  "Guidance",
  "Healing",
  "Relationships",
  "Travel",
  "Faith",
];

interface AddLovedOneModalProps {
  visible: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (name: string, categories: string[]) => Promise<void>;
}

export function AddLovedOneModal({
  visible,
  saving,
  error,
  onClose,
  onSubmit,
}: AddLovedOneModalProps) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) {
      setName("");
      setSelected([]);
    }
  }, [visible]);

  const toggleCategory = (category: string) => {
    setSelected((current) =>
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
          <Text style={styles.eyebrow}>PRAY FOR SOMEONE</Text>
          <Text style={styles.title}>Add a loved one</Text>
          <TextInput
            autoFocus
            editable={!saving}
            onChangeText={setName}
            placeholder="First name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={name}
          />
          <Text style={styles.label}>WHAT TO PRAY FOR</Text>
          <View style={styles.tags}>
            {categories.map((category) => {
              const active = selected.includes(category);
              return (
                <Pressable
                  key={category}
                  disabled={saving}
                  onPress={() => toggleCategory(category)}
                  style={[styles.tag, active && styles.tagActive]}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={!name.trim() || saving}
            onPress={() => onSubmit(name, selected)}
            style={[styles.submit, (!name.trim() || saving) && styles.disabled]}
          >
            <Text style={styles.submitText}>{saving ? "Adding..." : "Add"}</Text>
          </Pressable>
          <Pressable disabled={saving} onPress={onClose} style={styles.cancel}>
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
    fontSize: 17,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  label: {
    color: colors.muted,
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  tagActive: {
    backgroundColor: "rgba(249,115,22,0.14)",
    borderColor: "rgba(249,115,22,0.45)",
  },
  tagText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 12 },
  tagTextActive: { color: colors.accent },
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
  cancel: { alignItems: "center", paddingVertical: 18 },
  cancelText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 13 },
  disabled: { opacity: 0.35 },
});
