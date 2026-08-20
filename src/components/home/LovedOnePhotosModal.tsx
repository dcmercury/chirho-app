import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  setLovedOnePrimaryPhoto,
  uploadLovedOnePhoto,
} from "../../lib/api";
import {
  MAX_LOVED_ONE_PHOTOS,
  prepareLovedOnePhoto,
} from "../../lib/lovedOnePhoto";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import type { LovedOnePhoto } from "../../types/home";
import { AuthenticatedImage } from "../ui/AuthenticatedImage";

const MAX_PHOTOS = MAX_LOVED_ONE_PHOTOS;

type UploadStatus = "processing" | "uploading" | "complete" | "error";

interface UploadItem {
  id: string;
  status: UploadStatus;
  error?: string;
}

interface LovedOnePhotosModalProps {
  visible: boolean;
  lovedOne: { id: string; firstName: string } | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

export function LovedOnePhotosModal({
  visible,
  lovedOne,
  onClose,
  onChanged,
}: LovedOnePhotosModalProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [photos, setPhotos] = useState<LovedOnePhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingMediauuid, setPendingMediauuid] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const lovedOneId = lovedOne?.id;

  const requireToken = useCallback(async () => {
    const sessionToken = await getTokenRef.current();
    if (!sessionToken) {
      throw new Error("Your session expired. Please sign in again.");
    }
    return sessionToken;
  }, []);

  const loadPhotos = useCallback(async () => {
    if (!lovedOneId) return;
    setLoading(true);
    setError(null);
    try {
      const sessionToken = await requireToken();
      setPhotos(await getLovedOnePhotos(lovedOneId, sessionToken));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load these photos.",
      );
    } finally {
      setLoading(false);
    }
  }, [lovedOneId, requireToken]);

  useEffect(() => {
    if (visible && lovedOneId) {
      setUploads([]);
      void loadPhotos();
    } else {
      setPhotos([]);
      setError(null);
    }
  }, [loadPhotos, lovedOneId, visible]);

  const updateUpload = (id: string, updates: Partial<UploadItem>) => {
    setUploads((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const pickPhotos = async () => {
    if (!lovedOne || uploading) return;
    const remaining = MAX_PHOTOS - photos.length;
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

      const selected = result.assets.slice(0, remaining);
      const uploadItems = selected.map((_, index) => ({
        id: `${Date.now()}-${index}`,
        status: "processing" as const,
      }));
      setUploads(uploadItems);
      setUploading(true);
      const sessionToken = await requireToken();
      let uploadedAny = false;

      for (let index = 0; index < selected.length; index += 1) {
        const asset = selected[index];
        const item = uploadItems[index];
        try {
          const imageData = await prepareLovedOnePhoto(asset);
          updateUpload(item.id, { status: "uploading" });
          await uploadLovedOnePhoto(lovedOne.id, imageData, sessionToken);
          uploadedAny = true;
          updateUpload(item.id, { status: "complete" });
        } catch (uploadError) {
          updateUpload(item.id, {
            status: "error",
            error:
              uploadError instanceof Error
                ? uploadError.message
                : "Upload failed.",
          });
        }
      }

      if (uploadedAny) {
        setPhotos(await getLovedOnePhotos(lovedOne.id, sessionToken));
        await onChanged();
      }
    } catch (pickerError) {
      setError(
        pickerError instanceof Error
          ? pickerError.message
          : "Photos could not be opened. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const choosePrimary = async (photo: LovedOnePhoto) => {
    if (!lovedOne || pendingMediauuid || photo.isPrimary) return;
    setPendingMediauuid(photo.mediauuid);
    setError(null);
    try {
      const sessionToken = await requireToken();
      await setLovedOnePrimaryPhoto(lovedOne.id, photo.mediauuid, sessionToken);
      setPhotos(await getLovedOnePhotos(lovedOne.id, sessionToken));
      await onChanged();
    } catch (primaryError) {
      setError(
        primaryError instanceof Error
          ? primaryError.message
          : "Unable to choose the primary photo.",
      );
    } finally {
      setPendingMediauuid(null);
    }
  };

  const removePhoto = async (photo: LovedOnePhoto) => {
    if (!lovedOne || pendingMediauuid) return;
    setPendingMediauuid(photo.mediauuid);
    setError(null);
    try {
      const sessionToken = await requireToken();
      await deleteLovedOnePhoto(lovedOne.id, photo.mediauuid, sessionToken);
      setPhotos(await getLovedOnePhotos(lovedOne.id, sessionToken));
      await onChanged();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove the photo.",
      );
    } finally {
      setPendingMediauuid(null);
    }
  };

  const confirmRemove = (photo: LovedOnePhoto) => {
    Alert.alert(
      "Remove photo?",
      "This photo will no longer be used for prayers.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void removePhoto(photo),
        },
      ],
    );
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>PRIVATE PHOTOS</Text>
          <Text style={styles.title}>
            {lovedOne ? `Photos of ${lovedOne.firstName}` : "Loved one photos"}
          </Text>
          <Text style={styles.privacy}>
            Photos stay private and appear only on your personal prayer cards.
            Upload only photos you have permission to use.
          </Text>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>Loading photos…</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {photos.map((photo) => {
                const pending = pendingMediauuid === photo.mediauuid;
                return (
                  <View key={photo.mediauuid} style={styles.photoCard}>
                    <AuthenticatedImage
                      accessibilityLabel={
                        photo.isPrimary
                          ? `Primary photo of ${lovedOne?.firstName || "loved one"}`
                          : `Photo of ${lovedOne?.firstName || "loved one"}`
                      }
                      contentFit="cover"
                      path={photo.contentPath}
                      style={styles.photo}
                    />
                    {photo.isPrimary ? (
                      <Text style={styles.primaryBadge}>PRIMARY</Text>
                    ) : null}
                    <Pressable
                      accessibilityLabel={
                        photo.isPrimary
                          ? "Current primary photo"
                          : "Use as primary photo"
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: photo.isPrimary,
                        disabled: Boolean(pendingMediauuid),
                      }}
                      disabled={Boolean(pendingMediauuid) || photo.isPrimary}
                      onPress={() => void choosePrimary(photo)}
                      style={styles.photoAction}
                    >
                      <Text style={styles.photoActionText}>
                        {pending
                          ? "Saving…"
                          : photo.isPrimary
                            ? "Primary"
                            : "Make primary"}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Remove photo"
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: Boolean(pendingMediauuid),
                      }}
                      disabled={Boolean(pendingMediauuid)}
                      onPress={() => confirmRemove(photo)}
                      style={styles.removeAction}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  </View>
                );
              })}

              {photos.length < MAX_PHOTOS ? (
                <Pressable
                  accessibilityLabel={`Add up to ${MAX_PHOTOS - photos.length} photos`}
                  accessibilityRole="button"
                  accessibilityState={{ busy: uploading, disabled: uploading }}
                  disabled={uploading}
                  onPress={() => void pickPhotos()}
                  style={[styles.addCard, uploading && styles.disabled]}
                >
                  <Text style={styles.addIcon}>+</Text>
                  <Text style={styles.addText}>Choose photos</Text>
                  <Text style={styles.addMeta}>
                    {MAX_PHOTOS - photos.length} remaining
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {uploads.length ? (
            <View accessibilityLiveRegion="polite" style={styles.uploadList}>
              {uploads.map((item, index) => (
                <View key={item.id} style={styles.uploadRow}>
                  <Text style={styles.uploadText}>
                    Photo {index + 1}:{" "}
                    {item.status === "processing"
                      ? "Preparing…"
                      : item.status === "uploading"
                        ? "Uploading…"
                        : item.status === "complete"
                          ? "Uploaded"
                          : item.error || "Upload failed"}
                  </Text>
                  {item.status === "processing" ||
                  item.status === "uploading" ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={uploading || Boolean(pendingMediauuid)}
            onPress={onClose}
            style={[
              styles.done,
              (uploading || Boolean(pendingMediauuid)) && styles.disabled,
            ]}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </ScrollView>
      </View>
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
    marginBottom: 32,
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
    fontSize: 30,
    letterSpacing: -0.7,
  },
  privacy: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 12,
    marginBottom: 24,
  },
  loading: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 10,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  photoCard: {
    width: "47%",
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardFill,
  },
  photo: { width: "100%", aspectRatio: 1 },
  primaryBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    overflow: "hidden",
    borderRadius: 9,
    backgroundColor: colors.badgeOrange,
    color: colors.white,
    fontFamily: fonts.monoMedium,
    fontSize: 7,
    letterSpacing: 0.5,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  photoAction: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderSoft,
  },
  photoActionText: {
    color: colors.accentText,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
  },
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
  uploadList: { gap: 6, marginTop: 18 },
  uploadRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  uploadText: {
    flex: 1,
    color: colors.mutedSoft,
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 15,
    paddingRight: 8,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 16,
  },
  done: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    backgroundColor: colors.buttonPrimary,
    marginTop: 24,
  },
  doneText: {
    color: colors.buttonOnPrimary,
    fontFamily: fonts.displayMedium,
    fontSize: 14,
  },
  disabled: { opacity: 0.4 },
  });
}
