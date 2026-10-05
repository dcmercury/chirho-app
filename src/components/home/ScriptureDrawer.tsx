import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@clerk/expo";
import { getScripture } from "../../lib/api";
import { reportScriptureView } from "../../lib/bibleFums";
import { fonts, type as typography, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { CloseIcon } from "../../features/groups/components/Icons";
import type { SermonScripture, ScripturePassage } from "../../types/home";
import { ScriptureListenButton } from "./ScriptureListenButton";
import { ScriptureText } from "./ScriptureText";

export function ScriptureDrawer({
  scripture,
  onClose,
}: {
  scripture: SermonScripture | null;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [passage, setPassage] = useState<ScripturePassage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const passageId = scripture?.passageId || null;
  const reference = passage?.reference || scripture?.reference || "";

  useEffect(() => {
    setPassage(null);
    setError(null);
    if (!passageId) return;
    let active = true;
    (async () => {
      const token = await getTokenRef.current();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      return getScripture(token, passageId);
    })()
      .then((result) => {
        if (!active) return;
        setPassage(result);
        if (result.fums) void reportScriptureView(result.fums);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Scripture could not be loaded.");
        }
      });
    return () => {
      active = false;
    };
  }, [passageId]);

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={Boolean(scripture)}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.heading}>{reference}</Text>
            {passageId ? <ScriptureListenButton passageId={passageId} /> : null}
            <Pressable
              accessibilityLabel="Close Scripture"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.circle}
            >
              <CloseIcon color={colors.mutedStrong} size={14} />
            </Pressable>
          </View>

          {passage ? (
            <>
              <ScriptureText
                content={passage.content}
                reference={passage.reference || scripture?.reference}
              />
              <Text style={styles.translation}>{passage.translation}</Text>
              {passage.copyright ? (
                <Text style={styles.copyright}>{passage.copyright}</Text>
              ) : null}
            </>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <View style={styles.state}>
              <ActivityIndicator color={colors.mutedGhost} />
            </View>
          )}
        </ScrollView>
      </View>
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
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 24,
    },
    heading: {
      flex: 1,
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 32,
      letterSpacing: -0.8,
      lineHeight: 38,
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
    state: { paddingVertical: 48, alignItems: "center" },
    translation: {
      ...typography.labelSm,
      color: colors.muted,
      marginTop: 28,
    },
    copyright: {
      color: colors.mutedSoft,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 6,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      paddingVertical: 24,
    },
  });
}
