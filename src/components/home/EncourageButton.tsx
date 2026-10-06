import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@clerk/expo";
import Svg, { Path } from "react-native-svg";
import { encourageScripture } from "../../lib/api";
import { fonts, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";

function BubbleIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.2 6.8h9.4a2.6 2.6 0 0 1 2.6 2.6v5.1a2.6 2.6 0 0 1-2.6 2.6H9.4L6.4 19.8v-2.7H6.2a2.6 2.6 0 0 1-2.6-2.6V9.4a2.6 2.6 0 0 1 2.6-2.6Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: { alignItems: "flex-end" },
    button: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      backgroundColor: colors.glassFillHover,
      borderColor: colors.glassBorderHairline,
      borderWidth: 1,
    },
    pressed: { opacity: 0.65 },
    disabled: { opacity: 0.45 },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 8,
      maxWidth: 140,
      textAlign: "right",
    },
  });
}

export function EncourageButton({
  passageId,
  topic,
  ready,
}: {
  passageId: string;
  topic?: string | null;
  ready: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(null);
    setError(null);
    setBusy(false);
  }, [passageId, topic]);

  const openMessages = (body: string) => {
    const encoded = encodeURIComponent(body);
    const url = Platform.OS === "ios" ? `sms:&body=${encoded}` : `sms:?body=${encoded}`;
    return Linking.openURL(url);
  };

  const onPress = async () => {
    if (!ready || busy) return;
    setError(null);
    try {
      const body =
        text ??
        (await (async () => {
          setBusy(true);
          const token = await getToken();
          if (!token) throw new Error("Your session expired. Please sign in again.");
          const next = await encourageScripture(token, passageId, topic);
          setText(next);
          return next;
        })());
      await openMessages(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not write that note.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityLabel="Encourage a friend"
        accessibilityRole="button"
        accessibilityState={{ disabled: !ready || busy }}
        disabled={!ready || busy}
        hitSlop={6}
        onPress={() => {
          void onPress();
        }}
        style={({ pressed }) => [
          styles.button,
          pressed && ready && styles.pressed,
          (!ready || busy) && styles.disabled,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.mutedStrong} />
        ) : (
          <BubbleIcon color={colors.mutedStrong} size={18} />
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
