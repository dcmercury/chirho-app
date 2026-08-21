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
import { fonts, type as typography, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { Stagger } from "../../features/groups/components/Stagger";
import { WizardBackdrop } from "../ui/WizardBackdrop";
import {
  MAX_LOVED_ONE_PHOTOS,
  prepareLovedOnePhoto,
} from "../../lib/lovedOnePhoto";
import {
  PRAYER_CATEGORIES,
  PRAYER_VIRTUES,
  prayerCategoryLabel,
  prayerVirtueLabel,
  type LovedOnePrayerConfiguration,
} from "../../lib/prayerConfig";

interface PendingPhoto {
  id: string;
  uri: string;
  imageData: string;
}

type LovedOneStep = "name" | "categories" | "virtues" | "review";

const STEP_DOTS: LovedOneStep[] = ["name", "categories", "virtues", "review"];

interface AddLovedOneModalProps {
  visible: boolean;
  saving: boolean;
  error: string | null;
  dismissLabel?: string;
  onClose: () => void;
  onDismiss?: () => void;
  onSubmit: (
    name: string,
    configurations: LovedOnePrayerConfiguration[],
    photoDataUris: string[],
  ) => Promise<void>;
}

export function AddLovedOneModal({
  visible,
  saving,
  error,
  dismissLabel = "Cancel",
  onClose,
  onDismiss,
  onSubmit,
}: AddLovedOneModalProps) {
  const styles = useThemedStyles(createStyles);
  const { colors, appearance } = useTheme();
  const [step, setStep] = useState<LovedOneStep>("name");
  const [name, setName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryVirtues, setCategoryVirtues] = useState<Record<string, string[]>>(
    {},
  );
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [picking, setPicking] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const currentCategory = selectedCategories[categoryIndex];
  const currentVirtues = categoryVirtues[currentCategory] || [];
  const firstName = name.trim();

  useEffect(() => {
    if (!visible) {
      setStep("name");
      setName("");
      setSelectedCategories([]);
      setCategoryVirtues({});
      setCategoryIndex(0);
      setPhotos([]);
      setPhotoError(null);
      setStepError(null);
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
    setSelectedCategories((current) => {
      if (current.includes(category)) {
        setCategoryVirtues((virtues) => {
          const next = { ...virtues };
          delete next[category];
          return next;
        });
        return current.filter((item) => item !== category);
      }
      return [...current, category];
    });
  };

  const toggleVirtue = (virtue: string) => {
    if (!currentCategory) return;
    setCategoryVirtues((current) => {
      const virtues = current[currentCategory] || [];
      return {
        ...current,
        [currentCategory]: virtues.includes(virtue)
          ? virtues.filter((item) => item !== virtue)
          : [...virtues, virtue],
      };
    });
  };

  const configurations = selectedCategories
    .filter((category) => (categoryVirtues[category] || []).length)
    .map((category) => ({
      category,
      virtues: categoryVirtues[category],
    }));

  const submit = () => {
    void onSubmit(
      firstName,
      configurations,
      photos.map((photo) => photo.imageData),
    );
  };

  const jumpTo = (target: LovedOneStep) => {
    if (saving || picking || target === step) return;
    setStepError(null);
    if (target === "virtues") {
      setCategoryIndex(0);
    }
    setStep(target);
  };

  const goBack = () => {
    setStepError(null);
    if (step === "name") {
      onClose();
      return;
    }
    if (step === "categories") {
      setStep("name");
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
    if (categoryIndex > 0) {
      setCategoryIndex(selectedCategories.length - 1);
    }
    setStep("virtues");
  };

  const continueFromName = () => {
    if (!firstName) return;
    setStepError(null);
    setStep("categories");
  };

  const continueFromCategories = () => {
    if (!selectedCategories.length) {
      setStepError("Pick at least one area, or skip for now.");
      return;
    }
    setStepError(null);
    setCategoryIndex(0);
    setStep("virtues");
  };

  const continueFromVirtues = () => {
    if (!currentVirtues.length) {
      setStepError(
        `Pick at least one virtue for ${prayerCategoryLabel(currentCategory)}.`,
      );
      return;
    }
    setStepError(null);
    if (categoryIndex < selectedCategories.length - 1) {
      setCategoryIndex((index) => index + 1);
      return;
    }
    setStep("review");
  };

  const title =
    step === "name"
      ? "Add a loved one"
      : step === "categories"
        ? `Which areas of life for ${firstName}?`
        : step === "virtues"
          ? `Which virtues for ${firstName}'s ${prayerCategoryLabel(currentCategory)}?`
          : firstName
            ? `Your prayer for ${firstName} will include`
            : "Your prayer will include";

  const subtitle =
    step === "name"
      ? "A first name is enough. Photos stay private."
      : step === "categories"
        ? "Tap the parts of life you’d like to pray for."
        : step === "virtues"
          ? "AI will write prayers from the virtues you pick."
          : "Little typing. Daily prayers will follow this.";

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
        <WizardBackdrop />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>
            {firstName ? `PRAY FOR ${firstName.toUpperCase()}` : "PRAY FOR SOMEONE"}
          </Text>
          <View style={styles.dots}>
            {STEP_DOTS.map((item, index) => {
              const currentIndex = STEP_DOTS.indexOf(step);
              const reached = index <= currentIndex;
              return (
                <Pressable
                  key={item}
                  accessibilityLabel={`Step ${index + 1}`}
                  accessibilityRole="button"
                  disabled={!reached || item === step || saving || picking}
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
          {step !== "name" ? (
            <View style={styles.crumbs}>
              {firstName ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={saving || picking}
                  onPress={() => jumpTo("name")}
                  style={[styles.crumbTouch, styles.crumbItemEarly]}
                >
                  <Text style={styles.crumb} numberOfLines={1}>
                    {firstName}
                  </Text>
                </Pressable>
              ) : null}
              {step === "virtues" || step === "review" ? (
                <>
                  <Text style={styles.crumbSep}>→</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving || picking}
                    onPress={() => jumpTo("categories")}
                    style={[
                      styles.crumbTouch,
                      step === "review"
                        ? styles.crumbItemEarly
                        : styles.crumbItemLast,
                    ]}
                  >
                    <Text style={styles.crumb} numberOfLines={1}>
                      {selectedCategories.length
                        ? selectedCategories.map(prayerCategoryLabel).join(", ")
                        : "Areas"}
                    </Text>
                  </Pressable>
                </>
              ) : null}
              {step === "review" ? (
                <>
                  <Text style={styles.crumbSep}>→</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving || picking}
                    onPress={() => jumpTo("virtues")}
                    style={[styles.crumbTouch, styles.crumbItemLast]}
                  >
                    <Text style={styles.crumb} numberOfLines={1}>
                      Virtues
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}
          <View key={`${step}-${categoryIndex}`}>
            <Stagger delay={80}>
              <Text style={styles.title}>{title}</Text>
            </Stagger>
            <Stagger delay={180}>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </Stagger>
            <Stagger delay={280}>

          {step === "name" ? (
            <>
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
            </>
          ) : null}

          {step === "categories" ? (
            <View style={styles.tags}>
              {PRAYER_CATEGORIES.map((category) => {
                const active = selectedCategories.includes(category.id);
                return (
                  <Pressable
                    key={category.id}
                    disabled={saving}
                    onPress={() => toggleCategory(category.id)}
                    style={[styles.tag, active && styles.tagActive]}
                  >
                    <Text style={[styles.tagText, active && styles.tagTextActive]}>
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
                    disabled={saving}
                    onPress={() => toggleVirtue(virtue.id)}
                    style={[styles.tag, active && styles.tagActive]}
                  >
                    <Text style={[styles.tagText, active && styles.tagTextActive]}>
                      {virtue.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {step === "review" ? (
            <View style={styles.review}>
              {configurations.map((item, index) => (
                <View
                  key={item.category}
                  style={[
                    styles.reviewRow,
                    index === configurations.length - 1 && styles.reviewRowLast,
                  ]}
                >
                  <Text style={styles.reviewCategory}>
                    {prayerCategoryLabel(item.category)}
                  </Text>
                  <Text style={styles.reviewVirtues}>
                    {item.virtues.map(prayerVirtueLabel).join(" · ")}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

            </Stagger>
            <Stagger delay={400}>
          {photoError || error || stepError ? (
            <Text style={styles.error}>{photoError || error || stepError}</Text>
          ) : null}

          {step === "name" ? (
            <Pressable
              disabled={!firstName || saving || picking}
              onPress={continueFromName}
              style={[
                styles.submit,
                (!firstName || saving || picking) && styles.disabled,
              ]}
            >
              <Text style={styles.submitText}>Continue</Text>
            </Pressable>
          ) : null}

          {step === "categories" ? (
            <Pressable
              disabled={saving}
              onPress={continueFromCategories}
              style={[
                styles.submit,
                !selectedCategories.length && styles.disabled,
              ]}
            >
              <Text style={styles.submitText}>Continue</Text>
            </Pressable>
          ) : null}

          {step === "virtues" ? (
            <Pressable
              disabled={saving}
              onPress={continueFromVirtues}
              style={[styles.submit, !currentVirtues.length && styles.disabled]}
            >
              <Text style={styles.submitText}>
                {categoryIndex < selectedCategories.length - 1
                  ? "Next area"
                  : "Review"}
              </Text>
            </Pressable>
          ) : null}

          {step === "review" ? (
            <Pressable
              disabled={!firstName || saving || picking}
              onPress={submit}
              style={[
                styles.submit,
                (!firstName || saving || picking) && styles.disabled,
              ]}
            >
              <Text style={styles.submitText}>{saving ? "Adding..." : "Add"}</Text>
            </Pressable>
          ) : null}

          {step === "categories" ? (
            <Pressable
              disabled={saving || picking}
              onPress={submit}
              style={styles.skip}
            >
              <Text style={styles.skipText}>
                {saving ? "Adding..." : "Skip for now"}
              </Text>
            </Pressable>
          ) : null}
            </Stagger>
          </View>

          <View style={styles.actions}>
            {step !== "name" ? (
              <Pressable
                disabled={saving || picking}
                onPress={goBack}
                style={[
                  styles.secondary,
                  styles.backButton,
                  (saving || picking) && styles.disabled,
                ]}
              >
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            ) : null}
            <Pressable
              disabled={saving || picking}
              onPress={onClose}
              style={[styles.secondary, (saving || picking) && styles.disabled]}
            >
              <Text style={styles.cancelText}>{dismissLabel}</Text>
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
  input: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    color: colors.title,
    fontFamily: fonts.body,
    fontSize: 12,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  privacy: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 10,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
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
  label: {
    ...typography.labelSm,
    color: colors.muted,
    marginBottom: 10,
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
  },
  reviewRow: {
    minHeight: 50,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
    paddingVertical: 10,
  },
  reviewRowLast: { borderBottomWidth: 0 },
  reviewCategory: {
    color: colors.title,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  reviewVirtues: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 10,
    marginTop: 3,
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
  skip: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  skipText: {
    color: colors.accentText,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
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
