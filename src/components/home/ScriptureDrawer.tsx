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

/** API.Bible text marks verses as "[16] For God so loved…". */
function verses(content: string): { number: string | null; text: string }[] {
  const parts = content.split(/\[(\d+)\]\s*/);
  const result: { number: string | null; text: string }[] = [];
  if (parts[0].trim()) result.push({ number: null, text: parts[0].trim() });
  for (let index = 1; index < parts.length; index += 2) {
    result.push({ number: parts[index], text: (parts[index + 1] || "").trim() });
  }
  return result;
}

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
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>
                {(passage?.reference || scripture?.reference || "").toUpperCase()}
              </Text>
              <Text style={styles.heading}>A moment in Scripture</Text>
            </View>
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
              <Text style={styles.passage}>
                {verses(passage.content).map((verse, index) => (
                  <Text key={`${verse.number ?? "intro"}-${index}`}>
                    {verse.number ? (
                      <Text style={styles.verseNumber}>{verse.number} </Text>
                    ) : null}
                    {verse.text}
                    {" "}
                  </Text>
                ))}
              </Text>
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
    headerCopy: { flex: 1, minWidth: 0 },
    eyebrow: {
      ...typography.labelSm,
      color: colors.accent,
      marginBottom: 6,
    },
    heading: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 22,
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
    passage: {
      color: colors.title,
      fontFamily: fonts.body,
      fontSize: 17,
      lineHeight: 28,
    },
    verseNumber: {
      color: colors.accent,
      fontFamily: fonts.mono,
      fontSize: 11,
    },
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
