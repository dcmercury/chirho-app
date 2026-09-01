import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
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
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  deletePrayerFocusPhoto,
  getPrayerFocusPhotos,
  uploadPrayerFocusPhoto,
} from "../../lib/api";
import { prepareLovedOnePhoto } from "../../lib/lovedOnePhoto";
import { findDuplicatePrayerFocus } from "../../lib/subjectIdentity";
import { focusPhotoPath } from "../../lib/prayerFocusImage";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { CloseIcon } from "../../features/groups/components/Icons";
import { GlassInput } from "../ui/GlassInput";
import type {
  LovedOneGender,
  MediaPhoto,
  PrayerFocus,
  PrayerFocusInput,
  PrayerFocusSpecies,
  PrayerFocusType,
} from "../../types/home";
import { AuthenticatedImage } from "../ui/AuthenticatedImage";
import { GenderCircles } from "../ui/GenderCircles";
import { PrayerFocusCircle } from "./PrayerFocusCircle";
import { PrayerFocusTypeIcon } from "./PrayerFocusTypeIcon";
import { WizardBackdrop } from "../ui/WizardBackdrop";

interface PendingPhoto {
  id: string;
  uri: string;
  imageData: string;
}

const MAX_PRAYER_FOCUS_PHOTOS = 3;

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
  { value: "pet", label: "Pet" },
  { value: "church", label: "Church" },
  { value: "other", label: "Other" },
];

const species: { value: PrayerFocusSpecies; label: string }[] = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "other", label: "Other" },
];

function nameLabelForType(type: PrayerFocusType): string {
  if (type === "pet") return "Your pet's name";
  if (type === "church") return "Name of the church";
  if (type === "country") return "Which country";
  return "What are you praying for?";
}

/** A situation is a burden that recurs in the deck, so it skips the topic chips. */
export type PrayerFocusIntent = "thing" | "situation";

export function PrayerFocusModal({
  visible,
  focus,
  saving,
  error,
  nextOrder = 0,
  intent = "thing",
  existingFocuses = [],
  onClose,
  onDismiss,
  onSelectExisting,
  onSubmit,
}: {
  visible: boolean;
  focus: PrayerFocus | null;
  saving: boolean;
  error?: string | null;
  nextOrder?: number;
  intent?: PrayerFocusIntent;
  existingFocuses?: PrayerFocus[];
  onClose: () => void;
  onDismiss?: () => void;
  onSelectExisting?: (focus: PrayerFocus) => void;
  onSubmit: (input: PrayerFocusInput, newPhotos: string[]) => Promise<void>;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [title, setTitle] = useState("");
  const [type, setType] = useState<PrayerFocusType>("other");
  const [petSpecies, setPetSpecies] = useState<PrayerFocusSpecies | null>(null);
  const [petGender, setPetGender] = useState<LovedOneGender | null>(null);
  const [note, setNote] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [savedPhotos, setSavedPhotos] = useState<MediaPhoto[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [picking, setPicking] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const focusuuid = focus?.focusuuid;
  const photoCount = savedPhotos.length + pendingPhotos.length;
  const isSituation = (focus?.type || type) === "situation" || intent === "situation";
  const nameLabel = isSituation
    ? "What are you carrying?"
    : nameLabelForType(type);
  const duplicateFocus = focus
    ? undefined
    : findDuplicatePrayerFocus(existingFocuses, {
        title,
        type,
        species: type === "pet" ? petSpecies : null,
        gender: type === "pet" ? petGender : null,
      });
  const hasRequiredContext =
    Boolean(title.trim()) &&
    (type === "pet" || selectedCategories.length > 0) &&
    (type !== "pet" || Boolean(petSpecies && petGender));
  const submitDisabled = !hasRequiredContext || Boolean(duplicateFocus) || saving;
  const submitLabel = saving ? "Saving…" : focus ? "Save changes" : "Add focus";

  const chooseType = useCallback((next: PrayerFocusType) => {
    setType(next);
    setTitle((current) => {
      const trimmed = current.trim();
      const legacySeed = focusTypes.some((option) => option.label === trimmed);
      return legacySeed ? "" : current;
    });
  }, []);

  useEffect(() => {
    if (!visible) return;
    setTitle(focus?.title || "");
    setType(focus?.type || (intent === "situation" ? "situation" : "other"));
    setPetSpecies(focus?.species || null);
    setPetGender(focus?.gender || null);
    setNote(focus?.note || "");
    setSelectedCategories(focus ? focus.categories : ["general"]);
    setSavedPhotos(focus?.photos || []);
    setPendingPhotos([]);
    setPhotoError(null);
  }, [focus, intent, visible]);

  const requireToken = useCallback(async () => {
    const sessionToken = await getTokenRef.current();
    if (!sessionToken) {
      throw new Error("Your session expired. Please sign in again.");
    }
    return sessionToken;
  }, []);

  const pickPhotos = async () => {
    if (saving || picking) return;
    const remaining = MAX_PRAYER_FOCUS_PHOTOS - photoCount;
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
      const prepared: PendingPhoto[] = [];
      for (const asset of result.assets.slice(0, remaining)) {
        prepared.push({
          id: `${Date.now()}-${prepared.length}`,
          uri: asset.uri,
          imageData: await prepareLovedOnePhoto(asset),
        });
      }
      // An existing focus can store photos right away; a new one has no id yet,
      // so its photos ride along with the save.
      if (focusuuid) {
        const sessionToken = await requireToken();
        for (const photo of prepared) {
          await uploadPrayerFocusPhoto(focusuuid, photo.imageData, sessionToken);
        }
        setSavedPhotos(await getPrayerFocusPhotos(focusuuid, sessionToken));
      } else {
        setPendingPhotos((current) =>
          [...current, ...prepared].slice(0, MAX_PRAYER_FOCUS_PHOTOS),
        );
      }
    } catch (pickerError) {
      setPhotoError(
        pickerError instanceof Error
          ? pickerError.message
          : "Photos could not be added. Please try again.",
      );
    } finally {
      setPicking(false);
    }
  };

  const removeSavedPhoto = async (photo: MediaPhoto) => {
    if (!focusuuid || saving || picking) return;
    setPhotoError(null);
    try {
      const sessionToken = await requireToken();
      await deletePrayerFocusPhoto(focusuuid, photo.mediauuid, sessionToken);
      setSavedPhotos(await getPrayerFocusPhotos(focusuuid, sessionToken));
    } catch (removeError) {
      setPhotoError(
        removeError instanceof Error
          ? removeError.message
          : "The photo could not be removed.",
      );
    }
  };

  const confirmRemoveSaved = (photo: MediaPhoto) => {
    Alert.alert("Remove photo?", "This photo will no longer be used for prayers.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => void removeSavedPhoto(photo),
      },
    ]);
  };

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
      onDismiss={onDismiss}
      onRequestClose={onClose}
    >
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
          <Text style={styles.eyebrow}>DAILY PRAYER DECK</Text>
          <Text style={styles.title}>
            {isSituation ? "Pray about" : "Pray for my"}
          </Text>

          {!focus && existingFocuses.length && onSelectExisting ? (
            <>
              <Text style={styles.label}>ALREADY ADDED</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.existingRail}
                keyboardShouldPersistTaps="handled"
              >
                {existingFocuses.map((existingFocus) => (
                  <PrayerFocusCircle
                    key={existingFocus.focusuuid}
                    focus={existingFocus}
                    photoPath={focusPhotoPath(existingFocus)}
                    onPress={() => onSelectExisting(existingFocus)}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          {isSituation ? null : (
            <View style={styles.typeRow}>
              {focusTypes.map((option) => {
                const active = option.value === type;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: saving }}
                    disabled={saving}
                    onPress={() => chooseType(option.value)}
                    style={[styles.typeOption, active && styles.optionActive]}
                  >
                    <PrayerFocusTypeIcon
                      type={option.value}
                      color={active ? colors.accentText : colors.mutedSoft}
                      size={18}
                    />
                    <Text
                      style={[styles.typeText, active && styles.optionTextActive]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Text style={styles.label}>
            {type === "pet"
              ? "PET NAME · REQUIRED"
              : type === "church"
                ? "CHURCH NAME · REQUIRED"
                : "PRAYER FOCUS · REQUIRED"}
          </Text>
          <GlassInput
            accessibilityLabel={nameLabel}
            autoFocus
            editable={!saving}
            onChangeText={setTitle}
            placeholder={nameLabel}
            style={styles.input}
            value={title}
          />

          {type === "pet" ? (
            <>
              <Text style={styles.label}>PET TYPE AND GENDER · REQUIRED</Text>
              <View style={styles.petRow}>
                {species.map((option) => {
                  const active = option.value === petSpecies;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active, disabled: saving }}
                      disabled={saving}
                      onPress={() => setPetSpecies(option.value)}
                      style={[styles.pillOption, active && styles.optionActive]}
                    >
                      <Text
                        style={[styles.tagText, active && styles.optionTextActive]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
                <GenderCircles
                  disabled={saving}
                  onChange={setPetGender}
                  value={petGender}
                />
              </View>
            </>
          ) : null}

          <Text style={styles.label}>PHOTOS</Text>
          <Text style={styles.privacy}>
            Photos stay private and appear only on your personal prayer cards.
          </Text>
          <View style={styles.grid}>
            {savedPhotos.map((photo) => (
              <View key={photo.mediauuid} style={styles.photoCard}>
                <AuthenticatedImage
                  accessibilityLabel={`Photo for ${title || "prayer focus"}`}
                  contentFit="cover"
                  path={photo.contentPath}
                  style={styles.photo}
                />
                <Pressable
                  accessibilityLabel="Remove photo"
                  accessibilityRole="button"
                  disabled={saving || picking}
                  onPress={() => confirmRemoveSaved(photo)}
                  style={styles.removeAction}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            ))}
            {pendingPhotos.map((photo) => (
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
                    setPendingPhotos((current) =>
                      current.filter((item) => item.id !== photo.id),
                    )
                  }
                  style={styles.removeAction}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            ))}
            {photoCount < MAX_PRAYER_FOCUS_PHOTOS ? (
              <Pressable
                accessibilityLabel={`Add up to ${MAX_PRAYER_FOCUS_PHOTOS - photoCount} photos`}
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
                  {MAX_PRAYER_FOCUS_PHOTOS - photoCount} remaining
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.label, styles.photosLabel]}>
            NOTE OR INTENTION (OPTIONAL)
          </Text>
          <GlassInput
            accessibilityLabel="Prayer focus note or intention"
            editable={!saving}
            multiline
            onChangeText={setNote}
            placeholder="Add a little context for the prayer"
            style={[styles.input, styles.noteInput]}
            textAlignVertical="top"
            value={note}
          />

          {type === "pet" ? null : (
            <>
              <Text style={styles.label}>CATEGORIES · REQUIRED</Text>
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
                      <Text
                        style={[
                          styles.tagText,
                          active && styles.optionTextActive,
                        ]}
                      >
                        {category.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {!saving && !hasRequiredContext ? (
            <Text style={styles.requirement}>
              {type === "pet"
                ? "Add your pet’s name, type, and gender to continue."
                : "Add a name and choose at least one category to continue."}
            </Text>
          ) : null}

          {photoError || error || duplicateFocus ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {photoError ||
                error ||
                `${duplicateFocus?.title} is already in your prayer deck. Tap it above to pray.`}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              disabled={saving}
              hitSlop={8}
              onPress={onClose}
              style={[styles.circle, saving && styles.disabled]}
            >
              <CloseIcon color={colors.mutedStrong} size={14} />
            </Pressable>
            <Pressable
              accessibilityLabel={submitLabel}
              accessibilityRole="button"
              accessibilityState={{ disabled: submitDisabled }}
              disabled={submitDisabled}
              onPress={() =>
                onSubmit(
                  {
                    title: title.trim(),
                    type,
                    species: type === "pet" ? petSpecies : null,
                    gender: type === "pet" ? petGender : null,
                    note: note.trim() || null,
                    categories:
                      type === "pet"
                        ? focus?.type === "pet" && focus.categories.length
                          ? focus.categories
                          : ["general"]
                        : selectedCategories,
                    virtues: focus?.virtues || [],
                    // Focuses belong to both decks; the period picker was noise.
                    period: focus?.period || "both",
                    active: focus?.active ?? true,
                    order: focus?.order ?? nextOrder,
                  },
                  pendingPhotos.map((photo) => photo.imageData),
                )
              }
              style={[styles.submit, submitDisabled && styles.disabled]}
            >
              <Text style={styles.submitText}>{submitLabel}</Text>
            </Pressable>
          </View>
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
  existingRail: {
    flexGrow: 0,
    gap: 4,
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
  privacy: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 10,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoCard: {
    width: "47%",
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
  },
  photo: { width: "100%", aspectRatio: 1 },
  removeAction: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderSoft,
  },
  removeText: { color: colors.error, fontFamily: fonts.body, fontSize: 11 },
  addCard: {
    width: "47%",
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  addIcon: { color: colors.title, fontFamily: fonts.bodyMedium, fontSize: 18 },
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
    letterSpacing: 0.5,
    marginTop: 3,
    textTransform: "uppercase",
  },
  photosLabel: { marginTop: 24 },
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
    backgroundColor: colors.accentFillPill,
    borderColor: colors.accentBorderPill,
  },
  optionTextActive: { color: colors.accentText },
  petRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  pillOption: {
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
  requirement: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 10,
    marginTop: 16,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 28,
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
  disabled: { opacity: 0.35 },
  });
}
