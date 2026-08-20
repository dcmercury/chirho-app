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
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import {
  MAX_LOVED_ONE_PHOTOS,
  prepareLovedOnePhoto,
} from "../../lib/lovedOnePhoto";

interface PendingPhoto {
  id: string;
  uri: string;
  imageData: string;
}

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
  onDismiss?: () => void;
  onSubmit: (
    name: string,
    categories: string[],
    photoDataUris: string[],
  ) => Promise<void>;
}

export function AddLovedOneModal({
  visible,
  saving,
  error,
  onClose,
  onDismiss,
  onSubmit,
}: AddLovedOneModalProps) {
  const styles = useThemedStyles(createStyles);
  const { colors, appearance } = useTheme();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [picking, setPicking] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setName("");
      setSelected([]);
      setPhotos([]);
      setPhotoError(null);
    }
  }, [visible]);

  const pickPhotos = async () => {
    if (saving || picking) return;
    const remaining = MAX_LOVED_ONE_PHOTOS - photos.length;
    if (remaining <= 0) return;
    setPhotoError(null);
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        allowsEditing: false,
        base64: false,
        exif: false,
      });
      if (result.canceled || !result.assets.length) return;
      const selectedAssets = result.assets.slice(0, remaining);
      const prepared: PendingPhoto[] = [];
      for (const asset of selectedAssets) {
        prepared.push({
          id: `${Date.now()}-${prepared.length}`,
          uri: asset.uri,
          imageData: await prepareLovedOnePhoto(asset),
        });
      }
      setPhotos((current) => [...current, ...prepared].slice(0, MAX_LOVED_ONE_PHOTOS));
    } catch (pickerError) {
      setPhotoError(
        pickerError instanceof Error
          ? pickerError.message
          : "Photos could not be opened. Please try again.",
      );
    } finally {
      setPicking(false);
    }
  };

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
      onDismiss={onDismiss}
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
          <Text style={styles.eyebrow}>PRAY FOR SOMEONE</Text>
          <Text style={styles.title}>Add a loved one</Text>
          <TextInput
            autoFocus
            editable={!saving}
            onChangeText={setName}
            placeholder="First name"
            placeholderTextColor={colors.muted}
            keyboardAppearance={appearance === "light" ? "light" : "dark"}
            style={styles.input}
            value={name}
          />
          <Text style={styles.label}>PHOTOS</Text>
          <Text style={styles.privacy}>
            Photos stay private and appear only on your personal prayer cards.
          </Text>
          <View style={styles.grid}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoCard}>
                <Image
                  contentFit="cover"
                  source={{ uri: photo.uri }}
                  style={styles.photo}
                />
                <Pressable
                  accessibilityLabel="Remove photo"
                  accessibilityRole="button"
                  disabled={saving || picking}
                  onPress={() =>
                    setPhotos((current) =>
                      current.filter((item) => item.id !== photo.id),
                    )
                  }
                  style={styles.removeAction}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_LOVED_ONE_PHOTOS ? (
              <Pressable
                accessibilityLabel={`Add up to ${MAX_LOVED_ONE_PHOTOS - photos.length} photos`}
                accessibilityRole="button"
                accessibilityState={{ busy: picking, disabled: saving || picking }}
                disabled={saving || picking}
                onPress={() => void pickPhotos()}
                style={[styles.addCard, (saving || picking) && styles.disabled]}
              >
                <Text style={styles.addIcon}>+</Text>
                <Text style={styles.addText}>
                  {picking ? "Preparing…" : "Choose photos"}
                </Text>
                <Text style={styles.addMeta}>
                  {MAX_LOVED_ONE_PHOTOS - photos.length} remaining
                </Text>
              </Pressable>
            ) : null}
          </View>
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
          {photoError || error ? (
            <Text style={styles.error}>{photoError || error}</Text>
          ) : null}
          <Pressable
            disabled={!name.trim() || saving || picking}
            onPress={() =>
              onSubmit(
                name,
                selected,
                photos.map((photo) => photo.imageData),
              )
            }
            style={[
              styles.submit,
              (!name.trim() || saving || picking) && styles.disabled,
            ]}
          >
            <Text style={styles.submitText}>{saving ? "Adding..." : "Add"}</Text>
          </Pressable>
          <Pressable
            disabled={saving || picking}
            onPress={onClose}
            style={styles.cancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      </GestureHandlerRootView>
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
    fontSize: 17,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  privacy: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  photoCard: {
    width: "47%",
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardFill,
  },
  photo: { width: "100%", aspectRatio: 1 },
  removeAction: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderSoft,
  },
  removeText: { color: colors.error, fontFamily: fonts.body, fontSize: 10 },
  addCard: {
    width: "47%",
    minHeight: 190,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.glassBorderStrong,
  },
  addIcon: { color: colors.title, fontFamily: fonts.body, fontSize: 28 },
  addText: {
    color: colors.title,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    marginTop: 5,
  },
  addMeta: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 8,
    marginTop: 4,
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
    backgroundColor: colors.accentFillPill,
    borderColor: colors.accentBorderPill,
  },
  tagText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 12 },
  tagTextActive: { color: colors.accentText },
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
  cancel: { alignItems: "center", paddingVertical: 18 },
  cancelText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 13 },
  disabled: { opacity: 0.35 },
  });
}
