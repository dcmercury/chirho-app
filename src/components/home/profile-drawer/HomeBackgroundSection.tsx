import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { resolveImage } from "../../../lib/assets";
import { fonts, type ColorTokens } from "../../../theme/tokens";
import { useTheme, useThemedStyles } from "../../../theme/ThemeProvider";
import { PlusIcon } from "../../../features/groups/components/Icons";
import { InlineError, Section } from "./ProfileControls";

interface HomeBackgroundSectionProps {
  selectedUrls: string[];
  images: string[];
  pending: boolean;
  uploadPending?: boolean;
  error?: string;
  onSelect: (url: string) => void;
  onUpload: () => void;
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      gap: 10,
    },
    copy: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 17,
    },
    thumbs: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: 10,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.glassBorderMuted,
      backgroundColor: colors.groupFill,
    },
    thumbSelected: {
      borderColor: colors.accentBorderFocus,
      borderWidth: 2,
    },
    thumbImage: {
      width: "100%",
      height: "100%",
    },
    thumbSpinner: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.overlayThumb,
    },
    orderBadge: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    orderText: {
      color: colors.white,
      fontFamily: fonts.monoMedium,
      fontSize: 9,
      lineHeight: 11,
    },
    upload: {
      alignItems: "center",
      justifyContent: "center",
      borderStyle: "dashed",
    },
    disabled: {
      opacity: 0.4,
    },
  });
}

export function HomeBackgroundSection({
  selectedUrls,
  images,
  pending,
  uploadPending,
  error,
  onSelect,
  onUpload,
}: HomeBackgroundSectionProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const busy = pending || Boolean(uploadPending);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) setPendingUrl(null);
  }, [busy]);

  return (
    <Section title="Home background">
      <View style={styles.row}>
        <Text style={styles.copy}>
          Tap scenes to include them in the fade. Numbers show the order.
          Upload your own or pick from the library.
        </Text>
        <View style={styles.thumbs}>
          {images.map((url) => {
            const order = selectedUrls.indexOf(url);
            const selected = order >= 0;
            const choosing = pendingUrl === url;
            return (
              <Pressable
                key={url}
                accessibilityLabel={
                  selected
                    ? `Remove background ${order + 1}`
                    : "Add this background to the fade"
                }
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: busy, busy: choosing }}
                disabled={busy}
                onPress={() => {
                  setPendingUrl(url);
                  onSelect(url);
                }}
                style={[
                  styles.thumb,
                  selected && styles.thumbSelected,
                  busy && !choosing && styles.disabled,
                ]}
              >
                <Image
                  contentFit="cover"
                  source={resolveImage(url)}
                  style={styles.thumbImage}
                />
                {selected ? (
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderText}>{order + 1}</Text>
                  </View>
                ) : null}
                {choosing ? (
                  <View style={styles.thumbSpinner}>
                    <ActivityIndicator color={colors.white} size="small" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          <Pressable
            accessibilityLabel="Upload a background photo"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={onUpload}
            style={[styles.thumb, styles.upload, busy && styles.disabled]}
          >
            <PlusIcon color={colors.mutedSoft} size={14} />
          </Pressable>
        </View>
      </View>
      <InlineError message={error} />
    </Section>
  );
}
