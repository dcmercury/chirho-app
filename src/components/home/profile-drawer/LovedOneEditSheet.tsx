import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import * as ImagePicker from "expo-image-picker";
import {
  deleteLovedOnePhoto,
  getLovedOnePhotos,
  saveLovedOneConfig,
  setLovedOnePrimaryPhoto,
  uploadLovedOnePhoto,
} from "../../../lib/api";
import {
  MAX_LOVED_ONE_PHOTOS,
  prepareLovedOnePhoto,
} from "../../../lib/lovedOnePhoto";
import {
  PRAYER_CATEGORIES,
  PRAYER_VIRTUES,
  prayerCategoryLabel,
  type LovedOnePrayerConfiguration,
} from "../../../lib/prayerConfig";
import { fonts, type as typography, type ColorTokens } from "../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../theme/ThemeProvider";
import type { HomeProfile, LovedOneGender, LovedOnePhoto } from "../../../types/home";
import { AuthenticatedImage } from "../../ui/AuthenticatedImage";
import { GenderCircles } from "../../ui/GenderCircles";
import { WizardBackdrop } from "../../ui/WizardBackdrop";

type Person = HomeProfile["managedLovedOnes"][number];

function configsFromPerson(person: Person | null): LovedOnePrayerConfiguration[] {
  return (person?.configurations || []).map((item) => ({
    category: item.category.toLowerCase(),
    virtues: item.virtues.map((virtue) => virtue.toLowerCase()),
  }));
}

export function LovedOneEditSheet({
  visible,
  person,
  pending = false,
  onClose,
  onChanged,
  onGenderChange,
  onRemove,
}: {
  visible: boolean;
  person: Person | null;
  pending?: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onGenderChange: (id: string, gender: LovedOneGender) => void;
  onRemove: (id: string, firstName: string) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [photos, setPhotos] = useState<LovedOnePhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [savingReasons, setSavingReasons] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryVirtues, setCategoryVirtues] = useState<Record<string, string[]>>(
    {},
  );
  const savedRef = useRef("");
  const personId = person?.id;

  const configurations = selectedCategories
    .filter((category) => (categoryVirtues[category] || []).length)
    .map((category) => ({
      category,
      virtues: categoryVirtues[category],
    }));

  const requireToken = useCallback(async () => {
    const token = await getTokenRef.current();
    if (!token) throw new Error("Your session expired. Please sign in again.");
    return token;
  }, []);

  useEffect(() => {
    if (!visible || !person) {
      setPhotos([]);
      setError(null);
      return;
    }
    const configs = configsFromPerson(person);
    setSelectedCategories(configs.map((item) => item.category));
    setCategoryVirtues(
      Object.fromEntries(configs.map((item) => [item.category, item.virtues])),
    );
    savedRef.current = JSON.stringify(configs);
    setError(null);
    setLoadingPhotos(true);
    void (async () => {
      try {
        const token = await requireToken();
        setPhotos(await getLovedOnePhotos(person.id, token));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load photos.",
        );
      } finally {
        setLoadingPhotos(false);
      }
    })();
  }, [person, requireToken, visible]);

  const persistReasons = useCallback(async () => {
    if (!personId || JSON.stringify(configurations) === savedRef.current) {
      return;
    }
    if (!configurations.length) return;
    setSavingReasons(true);
    try {
      const token = await requireToken();
      await saveLovedOneConfig(personId, configurations, token);
      savedRef.current = JSON.stringify(configurations);
      await onChanged();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save reasons.",
      );
    } finally {
      setSavingReasons(false);
    }
  }, [configurations, onChanged, personId, requireToken]);

  const requestClose = useCallback(() => {
    void persistReasons().finally(() => onClose());
  }, [onClose, persistReasons]);

  const reloadPhotos = async () => {
    if (!personId) return;
    const token = await requireToken();
    setPhotos(await getLovedOnePhotos(personId, token));
    await onChanged();
  };

  const addPhotos = async () => {
    if (!person || busyPhoto) return;
    const remaining = MAX_LOVED_ONE_PHOTOS - photos.length;
    if (remaining <= 0) return;
    setError(null);
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
      setBusyPhoto(true);
      const token = await requireToken();
      for (const asset of result.assets.slice(0, remaining)) {
        await uploadLovedOnePhoto(
          person.id,
          await prepareLovedOnePhoto(asset),
          token,
        );
      }
      await reloadPhotos();
    } catch (pickError) {
      setError(
        pickError instanceof Error ? pickError.message : "Unable to add photos.",
      );
    } finally {
      setBusyPhoto(false);
    }
  };

  const choosePrimary = async (photo: LovedOnePhoto) => {
    if (!person || busyPhoto || photo.isPrimary) return;
    setBusyPhoto(true);
    setError(null);
    try {
      const token = await requireToken();
      await setLovedOnePrimaryPhoto(person.id, photo.mediauuid, token);
      await reloadPhotos();
    } catch (primaryError) {
      setError(
        primaryError instanceof Error
          ? primaryError.message
          : "Unable to choose this photo.",
      );
    } finally {
      setBusyPhoto(false);
    }
  };

  const removePhoto = async (photo: LovedOnePhoto) => {
    if (!person || busyPhoto) return;
    setBusyPhoto(true);
    setError(null);
    try {
      const token = await requireToken();
      await deleteLovedOnePhoto(person.id, photo.mediauuid, token);
      await reloadPhotos();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove this photo.",
      );
    } finally {
      setBusyPhoto(false);
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

  const toggleVirtue = (category: string, virtue: string) => {
    setCategoryVirtues((current) => {
      const virtues = current[category] || [];
      return {
        ...current,
        [category]: virtues.includes(virtue)
          ? virtues.filter((item) => item !== virtue)
          : [...virtues, virtue],
      };
    });
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible && Boolean(person)}
      onRequestClose={requestClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <WizardBackdrop
          paths={photos.map((photo) => photo.contentPath)}
        />
        {person ? (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              hitSlop={20}
              onPress={requestClose}
              style={styles.handle}
            />
            <Text style={styles.title}>{person.firstName}</Text>

            {person.kind === "family" ? null : (
              <>
                <Text style={styles.label}>Gender</Text>
                <GenderCircles
                  disabled={pending}
                  onChange={(gender) => onGenderChange(person.id, gender)}
                  size="sm"
                  value={person.gender}
                />
              </>
            )}

            <Text style={styles.label}>Reasons</Text>
            <Text style={styles.prompt}>
              Which areas of life for {person.firstName}?
            </Text>
            <View style={styles.tags}>
              {PRAYER_CATEGORIES.map((category) => {
                const active = selectedCategories.includes(category.id);
                return (
                  <Pressable
                    key={category.id}
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
            {selectedCategories.map((category) => (
              <View key={category} style={styles.virtueBlock}>
                <Text style={styles.prompt}>
                  {person.kind === "family"
                    ? `Virtues for ${person.firstName} in ${prayerCategoryLabel(category)}`
                    : `Virtues for ${person.firstName}'s ${prayerCategoryLabel(category)}`}
                </Text>
                <View style={styles.tags}>
                  {PRAYER_VIRTUES.map((virtue) => {
                    const active = (categoryVirtues[category] || []).includes(
                      virtue.id,
                    );
                    return (
                      <Pressable
                        key={virtue.id}
                        onPress={() => toggleVirtue(category, virtue.id)}
                        style={[styles.tag, active && styles.tagActive]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            active && styles.tagTextActive,
                          ]}
                        >
                          {virtue.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            {savingReasons ? (
              <Text style={styles.hint}>Saving reasons…</Text>
            ) : null}

            <Text style={styles.label}>Photos</Text>
            {loadingPhotos ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoRail}
              >
                {photos.map((photo) => (
                  <Pressable
                    key={photo.mediauuid}
                    accessibilityLabel={
                      photo.isPrimary ? "Primary photo" : "Use as primary"
                    }
                    disabled={busyPhoto}
                    onLongPress={() => void removePhoto(photo)}
                    onPress={() => void choosePrimary(photo)}
                    style={styles.photoThumb}
                  >
                    <AuthenticatedImage
                      contentFit="cover"
                      path={photo.contentPath}
                      style={StyleSheet.absoluteFill}
                    />
                    {photo.isPrimary ? (
                      <View style={styles.primaryDot} />
                    ) : null}
                  </Pressable>
                ))}
                {photos.length < MAX_LOVED_ONE_PHOTOS ? (
                  <Pressable
                    accessibilityLabel="Add photos"
                    accessibilityRole="button"
                    disabled={busyPhoto}
                    onPress={() => void addPhotos()}
                    style={[styles.photoThumb, styles.addThumb]}
                  >
                    <Text style={styles.addMark}>+</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            )}
            <Text style={styles.hint}>
              Tap a photo to make it primary. Hold to remove.
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityLabel="Done"
                accessibilityRole="button"
                disabled={pending}
                onPress={requestClose}
                style={[styles.cancelBtn, pending && styles.disabled]}
              >
                <Text style={styles.cancelText}>Done</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Remove ${person.firstName}`}
                accessibilityRole="button"
                disabled={pending}
                onPress={() => {
                  onRemove(person.id, person.firstName);
                  onClose();
                }}
                style={[styles.removeBtn, pending && styles.disabled]}
              >
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : null}
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
      marginBottom: 14,
    },
    title: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 34,
      letterSpacing: -0.8,
      marginBottom: 8,
    },
    label: {
      ...typography.labelSm,
      color: colors.muted,
      marginTop: 16,
      marginBottom: 8,
    },
    prompt: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      marginBottom: 8,
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
    virtueBlock: { marginTop: 14 },
    photoRail: { gap: 8, paddingVertical: 2 },
    photoThumb: {
      width: 56,
      height: 56,
      borderRadius: 28,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glassFill,
    },
    addThumb: {
      alignItems: "center",
      justifyContent: "center",
      borderStyle: "dashed",
    },
    addMark: { color: colors.title, fontFamily: fonts.bodyMedium, fontSize: 18 },
    primaryDot: {
      position: "absolute",
      right: 4,
      bottom: 4,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    hint: {
      color: colors.muted,
      fontFamily: fonts.mono,
      fontSize: 9,
      marginTop: 8,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 11,
      marginTop: 10,
    },
    actions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 20,
    },
    cancelBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.glassBorderLoud,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 12,
    },
    removeBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.error,
    },
    removeText: {
      color: colors.buttonOnPrimary,
      fontFamily: fonts.displayMedium,
      fontSize: 12,
    },
    disabled: { opacity: 0.35 },
  });
}
