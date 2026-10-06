import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@clerk/expo";
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { getScripture, searchScripture } from "../../lib/api";
import { reportScriptureView } from "../../lib/bibleFums";
import type {
  ScripturePassage,
  ScriptureSearchHit,
  ScriptureSearchMode,
} from "../../types/home";
import { fonts, type as typography, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import { Stagger } from "../../features/groups/components/Stagger";
import { CloseIcon } from "../../features/groups/components/Icons";
import { Pill, useProfileStyles } from "./profile-drawer/ProfileControls";
import { ScriptureListenButton } from "./ScriptureListenButton";
import { ScriptureText } from "./ScriptureText";

const TOPIC_GROUPS = [
  {
    title: "Carrying",
    labels: ["Anxiety", "Grief", "Shame", "Loneliness", "Anger"],
  },
  {
    title: "Looking for",
    labels: ["Grace", "Peace", "Hope", "Courage", "Gratitude"],
  },
] as const;

function topicQuery(label: string): string {
  return `verses about ${label.toLowerCase()}`;
}

function selectedTopic(query: string): string | null {
  const trimmed = query.trim().toLowerCase();
  for (const group of TOPIC_GROUPS) {
    const match = group.labels.find((label) => topicQuery(label) === trimmed);
    if (match) return match;
  }
  return null;
}

function topicTitle(query: string): string {
  const chip = selectedTopic(query);
  if (chip) return chip;
  const trimmed = query.trim().replace(/[.?]+$/, "");
  const about = trimmed.match(/^verses about\s+(.+)$/i);
  const raw = (about?.[1] ?? trimmed).trim();
  if (!raw) return "I want to search for";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function TopicChips({
  disabled,
  onSelect,
  selected,
}: {
  disabled: boolean;
  onSelect: (label: string) => void;
  selected: string | null;
}) {
  const styles = useProfileStyles();
  return (
    <View style={{ gap: 16 }}>
      {TOPIC_GROUPS.map((group) => (
        <View key={group.title} style={{ gap: 7 }}>
          <Text style={styles.sectionTitle}>{group.title}</Text>
          <View style={styles.pills}>
            {group.labels.map((label) => (
              <Pill
                key={label}
                active={selected === label}
                disabled={disabled}
                label={label}
                onPress={() => onSelect(label)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const modes: { value: ScriptureSearchMode; label: string }[] = [
  { value: "reference", label: "Reference" },
  { value: "topic", label: "Topic" },
];

const OPTION_BASE_DELAY = 1300;

function ReferenceIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5.2h5.1A2.9 2.9 0 0 1 13 8.1V19a2.3 2.3 0 0 0-2.3-2.3H5V5.2Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path
        d="M19 5.2h-5.1A2.9 2.9 0 0 0 11 8.1V19a2.3 2.3 0 0 1 2.3-2.3H19V5.2Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TopicIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={5.5} stroke={color} strokeWidth={1.7} />
      <Path
        d="M14.8 14.8 19.5 19.5"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    block: { marginTop: 36 },
    blockActive: { marginTop: 0 },
    eyebrow: {
      color: colors.accent,
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
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
      gap: 14,
    },
    option: {
      alignItems: "center",
      gap: 10,
    },
    pressed: { opacity: 0.65, transform: [{ scale: 0.96 }] },
    optionIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.accentBorderMuted,
      backgroundColor: colors.accentFillMid,
      alignItems: "center",
      justifyContent: "center",
    },
    optionLabel: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 13,
      fontWeight: "500",
      textAlign: "center",
    },
    query: { gap: 14 },
    fieldWrap: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    field: {
      flex: 1,
      minHeight: 48,
      paddingLeft: 14,
      paddingRight: 8,
      paddingVertical: 12,
      color: colors.title,
      fontFamily: fonts.body,
      fontSize: 16,
    },
    fieldSearch: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    actions: {
      alignItems: "center",
      marginTop: 56,
    },
    cancelIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "#000000",
      alignItems: "center",
      justifyContent: "center",
    },
    disabled: { opacity: 0.45 },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    hits: { gap: 8 },
    hit: {
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    hitReference: {
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 16,
    },
    hitReason: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    passageHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },
    passageReference: {
      flex: 1,
      color: colors.title,
      fontFamily: fonts.displayMedium,
      fontSize: 34,
      letterSpacing: -0.8,
      lineHeight: 40,
    },
    translation: {
      ...typography.labelSm,
      color: colors.muted,
      marginTop: 22,
    },
    copyright: {
      color: colors.mutedSoft,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 6,
    },
  });
}

export function ScriptureSearchChoices({
  visible,
  animated = false,
  onOpenPassage,
  onSearchingChange,
  onStepChange,
}: {
  visible: boolean;
  animated?: boolean;
  onOpenPassage: (hit: ScriptureSearchHit, topic?: string) => void;
  onSearchingChange?: (searching: boolean) => void;
  onStepChange?: (active: boolean) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const [mode, setMode] = useState<ScriptureSearchMode | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ScriptureSearchHit[]>([]);
  const [passage, setPassage] = useState<ScripturePassage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) return;
    setMode(null);
    setQuery("");
    setHits([]);
    setPassage(null);
    setError(null);
    setBusy(false);
    onSearchingChange?.(false);
    onStepChange?.(false);
  }, [onSearchingChange, onStepChange, visible]);

  useEffect(() => {
    onStepChange?.(mode !== null);
  }, [mode, onStepChange]);

  const chooseMode = (next: ScriptureSearchMode) => {
    setMode(next);
    setHits([]);
    setPassage(null);
    setError(null);
  };

  const cancelSearch = () => {
    if (busy) return;
    setMode(null);
    setQuery("");
    setHits([]);
    setPassage(null);
    setError(null);
  };

  const submit = async (raw?: string) => {
    if (!mode || busy) return;
    const trimmed = (raw ?? query).trim();
    if (!trimmed) {
      setHits([]);
      setError(
        mode === "reference"
          ? "Add a reference to search for."
          : "Add a topic to search for.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    setHits([]);
    setPassage(null);
    onSearchingChange?.(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const next = await searchScripture(token, trimmed, mode);
      if (next.length === 0) {
        setError("No passages found for that search.");
        return;
      }
      if (mode === "reference" && next.length === 1) {
        const loaded = await getScripture(token, next[0].passageId);
        if (loaded.fums) void reportScriptureView(loaded.fums);
        setPassage(loaded);
        return;
      }
      setHits(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Scripture search failed.",
      );
    } finally {
      setBusy(false);
      onSearchingChange?.(false);
    }
  };

  const chooseTopic = (label: string) => {
    if (selectedTopic(query) === label) {
      setQuery("");
      setError(null);
      return;
    }
    const next = topicQuery(label);
    setQuery(next);
    void submit(next);
  };

  const activeTopic = mode === "topic" && hits.length > 0 ? topicTitle(query) : null;
  const eyebrow = <Text style={styles.eyebrow}>SCRIPTURE SEARCH</Text>;
  const title = (
    <Text style={styles.title}>{activeTopic ?? "I want to search for"}</Text>
  );

  const motion = FadeInDown.duration(420)
    .easing(Easing.bezier(0.22, 1, 0.36, 1))
    .reduceMotion(ReduceMotion.System);

  return (
    <Animated.View
      layout={LinearTransition.duration(420).easing(Easing.bezier(0.22, 1, 0.36, 1))}
      style={[styles.block, mode ? styles.blockActive : null]}
    >
      {animated && !mode ? (
        <>
          <Stagger delay={1060}>{eyebrow}</Stagger>
          <Stagger delay={1180}>{title}</Stagger>
        </>
      ) : (
        <>
          {eyebrow}
          {passage ? null : title}
        </>
      )}

      {mode ? (
        <Animated.View
          entering={motion}
          exiting={FadeOut.duration(220)}
          style={styles.query}
        >
          {passage ? (
            <View>
              <View style={styles.passageHeader}>
                <Text style={styles.passageReference}>{passage.reference}</Text>
                <ScriptureListenButton passageId={passage.passageId} />
              </View>
              <ScriptureText
                content={passage.content}
                reference={passage.reference}
              />
              <Text style={styles.translation}>{passage.translation}</Text>
              {passage.copyright ? (
                <Text style={styles.copyright}>{passage.copyright}</Text>
              ) : null}
            </View>
          ) : hits.length === 0 ? (
            <>
              <View style={styles.fieldWrap}>
                <TextInput
                  accessibilityLabel={
                    mode === "reference" ? "Scripture reference" : "Scripture topic"
                  }
                  editable={!busy}
                  onChangeText={setQuery}
                  onSubmitEditing={() => {
                    void submit();
                  }}
                  placeholder={
                    mode === "reference" ? "John 3:16" : "verses about anxiety"
                  }
                  placeholderTextColor={colors.muted}
                  returnKeyType="search"
                  style={styles.field}
                  value={query}
                />
                <Pressable
                  accessibilityLabel="Search Scripture"
                  accessibilityRole="button"
                  disabled={busy}
                  hitSlop={6}
                  onPress={() => {
                    void submit();
                  }}
                  style={({ pressed }) => [
                    styles.fieldSearch,
                    pressed && styles.pressed,
                    busy && styles.disabled,
                  ]}
                >
                  <TopicIcon color={colors.accent} size={20} />
                </Pressable>
              </View>
              {mode === "topic" ? (
                <TopicChips
                  disabled={busy}
                  onSelect={chooseTopic}
                  selected={selectedTopic(query)}
                />
              ) : null}
            </>
          ) : (
            <View style={styles.hits}>
              {hits.map((hit) => (
                <Pressable
                  key={hit.passageId}
                  accessibilityLabel={hit.reference}
                  accessibilityRole="button"
                  onPress={() => onOpenPassage(hit, activeTopic ?? undefined)}
                  style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
                >
                  <Text style={styles.hitReference}>{hit.reference}</Text>
                  {hit.reason ? (
                    <Text style={styles.hitReason}>{hit.reason}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityLabel="Cancel search"
              accessibilityRole="button"
              disabled={busy}
              onPress={cancelSearch}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              <View style={styles.cancelIcon}>
                <CloseIcon color="#FFFFFF" size={20} />
              </View>
              <Text style={styles.optionLabel}>Cancel</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          exiting={FadeOut.duration(220)}
          style={styles.row}
        >
          {modes.map((item, index) => {
            const button = (
              <Pressable
                accessibilityLabel={item.label}
                accessibilityRole="button"
                onPress={() => chooseMode(item.value)}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <View style={styles.optionIcon}>
                  {item.value === "reference" ? (
                    <ReferenceIcon color={colors.accent} size={24} />
                  ) : (
                    <TopicIcon color={colors.accent} size={24} />
                  )}
                </View>
                <Text style={styles.optionLabel}>{item.label}</Text>
              </Pressable>
            );
            return animated ? (
              <Stagger key={item.value} delay={OPTION_BASE_DELAY + index * 90}>
                {button}
              </Stagger>
            ) : (
              <View key={item.value}>{button}</View>
            );
          })}
        </Animated.View>
      )}
    </Animated.View>
  );
}
