import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { API_BASE, resolveImage } from "../../lib/assets";
import { trackPrayerShare } from "../../lib/api";
import { colors, fonts } from "../../theme/tokens";
import type { HomePrayerCard } from "../../types/home";

interface PrayerDetailModalProps {
  card: HomePrayerCard | null;
  token: string | null;
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
}

export function PrayerDetailModal({
  card,
  token,
  visible,
  loading = false,
  onClose,
}: PrayerDetailModalProps) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const loadedPrayerRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible) {
      player.pause();
      loadedPrayerRef.current = null;
    }
  }, [player, visible]);

  const toggleAudio = () => {
    if (!card?.prayeruuid || !token) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (loadedPrayerRef.current !== card.prayeruuid) {
      player.replace({
        uri: `${API_BASE}/api/prayer-audio/${card.prayeruuid}`,
        headers: { Authorization: `Bearer ${token}` },
        name: card.title,
      });
      loadedPrayerRef.current = card.prayeruuid;
    }
    player.play();
  };

  const sharePrayer = async () => {
    if (!card?.prayeruuid) return;
    if (token) {
      trackPrayerShare(card.prayeruuid, token).catch(() => undefined);
    }
    await Share.share({
      title: card.title,
      message: `${card.title}\n${API_BASE}/prayercards/${card.prayeruuid}`,
      url: `${API_BASE}/prayercards/${card.prayeruuid}`,
    });
  };

  return (
    <Modal
      animationType="fade"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Image
          source={resolveImage(card?.image)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={350}
        />
        <View style={[StyleSheet.absoluteFill, styles.overlay]} />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="large" />
          ) : (
            <>
              <Text style={styles.verse}>{card?.verse || "PERSONAL PRAYER"}</Text>
              <Text style={styles.title}>{card?.title}</Text>
              <Text style={styles.prayer}>{card?.fullPrayer || card?.text}</Text>
              {card?.date ? <Text style={styles.date}>{card.date}</Text> : null}
            </>
          )}
        </ScrollView>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={status.playing ? "Pause prayer" : "Listen to prayer"}
            disabled={!card?.prayeruuid || !token}
            onPress={toggleAudio}
            style={({ pressed }) => [
              styles.primaryAction,
              (!card?.prayeruuid || !token) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryActionText}>
              {status.playing ? "Pause" : "Listen"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share prayer"
            disabled={!card?.prayeruuid}
            onPress={sharePrayer}
            style={({ pressed }) => [
              styles.action,
              !card?.prayeruuid && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close prayer"
            onPress={onClose}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Text style={styles.actionText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 90,
    paddingBottom: 150,
  },
  verse: {
    color: colors.accent,
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  title: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 36,
    fontWeight: "500",
    letterSpacing: -0.9,
    lineHeight: 40,
    marginBottom: 24,
  },
  prayer: {
    color: "rgba(255,255,255,0.82)",
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 29,
  },
  date: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 24,
    textTransform: "uppercase",
  },
  actions: {
    position: "absolute",
    bottom: 28,
    left: 24,
    right: 24,
    flexDirection: "row",
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: colors.white,
  },
  primaryActionText: {
    color: colors.black,
    fontFamily: fonts.displayMedium,
    fontSize: 14,
    fontWeight: "500",
  },
  action: {
    minWidth: 68,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: "rgba(20,20,20,0.78)",
    borderColor: colors.glassBorder,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  actionText: {
    color: colors.white,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.72,
  },
});
