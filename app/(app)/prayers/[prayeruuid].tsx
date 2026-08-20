import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PrayerDetailModal } from "../../../src/components/home/PrayerDetailModal";
import { getPrayer } from "../../../src/lib/api";
import { fonts, type ColorTokens } from "../../../src/theme/tokens";
import { useTheme, useThemedStyles } from "../../../src/theme/ThemeProvider";
import type { HomePrayerCard } from "../../../src/types/home";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.canvas,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 13,
      padding: 24,
      textAlign: "center",
    },
  });
}

export default function PrayerRoute() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { prayeruuid } = useLocalSearchParams<{ prayeruuid: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [card, setCard] = useState<HomePrayerCard | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const load = useCallback(async () => {
    if (!prayeruuid) return;
    try {
      const sessionToken = await getTokenRef.current();
      if (!sessionToken) throw new Error("Your session expired.");
      setToken(sessionToken);
      setCard(await getPrayer(prayeruuid, sessionToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load this prayer");
    }
  }, [prayeruuid]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.title} />
      <PrayerDetailModal
        card={card}
        token={token}
        visible
        loading={!card}
        onClose={() => router.back()}
      />
    </View>
  );
}
