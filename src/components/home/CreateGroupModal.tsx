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
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";

export function CreateGroupModal({
  visible,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors, appearance } = useTheme();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!visible) setName("");
  }, [visible]);

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
          <Text style={styles.eyebrow}>PRAYER GROUPS</Text>
          <Text style={styles.title}>Start a group</Text>
          <TextInput
            accessibilityLabel="Group name"
            autoFocus
            editable={!saving}
            onChangeText={setName}
            placeholder="Name this prayer group"
            placeholderTextColor={colors.muted}
            keyboardAppearance={appearance === "light" ? "light" : "dark"}
            style={styles.input}
            value={name}
          />
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !name.trim() || saving }}
            disabled={!name.trim() || saving}
            onPress={() => onSubmit(name.trim())}
            style={[styles.submit, (!name.trim() || saving) && styles.disabled]}
          >
            <Text style={styles.submitText}>
              {saving ? "Creating…" : "Create group"}
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

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
      marginBottom: 26,
    },
    input: {
      minHeight: 58,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glassFill,
      color: colors.title,
      fontFamily: fonts.body,
      fontSize: 16,
      paddingHorizontal: 16,
      marginBottom: 8,
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
      backgroundColor: colors.buttonPrimary,
      marginTop: 28,
    },
    submitText: {
      color: colors.buttonOnPrimary,
      fontFamily: fonts.displayMedium,
      fontSize: 15,
    },
    cancel: { minHeight: 48, alignItems: "center", justifyContent: "center" },
    cancelText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 13 },
    disabled: { opacity: 0.35 },
  });
}
