import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { HomeCommunity } from "../../../types/home";
import { useTheme } from "../../../theme/ThemeProvider";
import { GlassInput } from "../../ui/GlassInput";
import { InlineError, ManageAvatar, useProfileStyles } from "./ProfileControls";
import type { CommunitySearchResult } from "./types";

export function CommunitySection({
  visible,
  community,
  searchPending,
  leavePending,
  error,
  isJoinPending,
  onSearch,
  onJoin,
  onLeave,
}: {
  visible: boolean;
  community: HomeCommunity | null;
  searchPending: boolean;
  leavePending: boolean;
  error?: string;
  isJoinPending: (uuid: string) => boolean;
  onSearch: (query: string) => Promise<CommunitySearchResult[]>;
  onJoin: (uuid: string) => Promise<boolean>;
  onLeave: (name: string) => void;
}) {
  const styles = useProfileStyles();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommunitySearchResult[]>([]);
  const searchGeneration = useRef(0);

  useEffect(() => {
    if (!visible) {
      searchGeneration.current += 1;
      setQuery("");
      setResults([]);
    }
  }, [visible]);

  const search = async () => {
    if (!query.trim() || searchPending) return;
    const generation = ++searchGeneration.current;
    const nextResults = await onSearch(query.trim());
    if (generation === searchGeneration.current) setResults(nextResults);
  };

  const join = async (uuid: string) => {
    if (await onJoin(uuid)) {
      setResults([]);
      setQuery("");
    }
  };

  return (
    <>
      {community ? (
        <View style={styles.manageRow}>
          <ManageAvatar
            label={community.name}
            source={community.logo || community.backgroundImage}
          />
          <View style={styles.manageCopy}>
            <Text style={styles.manageName}>{community.name}</Text>
            <Text style={styles.manageMeta}>
              {community.location || community.tradition || "Active community"}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={`Leave active community ${community.name}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: leavePending }}
            disabled={leavePending}
            onPress={() => onLeave(community.name)}
            style={leavePending && styles.disabled}
          >
            <Text style={styles.remove}>Leave</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.empty}>No active community</Text>
      )}
      {community?.donationLink ? (
        <Pressable
          accessibilityLabel={`Open donation page for ${community.name}`}
          accessibilityRole="link"
          onPress={() => {
            void Linking.openURL(community.donationLink as string);
          }}
        >
          <Text style={styles.manageMeta}>Support {community.name}</Text>
        </Pressable>
      ) : null}
      <View style={styles.communitySearch}>
        <GlassInput
          accessibilityLabel="Find a church or community"
          editable={!searchPending}
          onChangeText={setQuery}
          onSubmitEditing={() => {
            void search();
          }}
          placeholder="Find a church or community"
          returnKeyType="search"
          style={[styles.input, styles.communityInput]}
          value={query}
        />
        <Pressable
          accessibilityLabel="Search communities"
          accessibilityRole="button"
          accessibilityState={{
            busy: searchPending,
            disabled: searchPending || !query.trim(),
          }}
          disabled={searchPending || !query.trim()}
          hitSlop={6}
          onPress={() => {
            void search();
          }}
          style={styles.communitySearchIcon}
        >
          {searchPending ? (
            <ActivityIndicator color={colors.mutedGhost} size="small" />
          ) : (
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Circle
                cx={11}
                cy={11}
                r={7}
                stroke={colors.mutedGhost}
                strokeWidth={2}
              />
              <Path
                d="m20 20-3.5-3.5"
                stroke={colors.mutedGhost}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          )}
        </Pressable>
      </View>
      {results.map((result) => {
        const pending = isJoinPending(result.uuid);
        return (
          <View key={result.uuid} style={styles.manageRow}>
            <ManageAvatar label={result.name} source={result.logo} />
            <View style={styles.manageCopy}>
              <Text style={styles.manageName}>{result.name}</Text>
              <Text style={styles.manageMeta}>{result.location}</Text>
            </View>
            <Pressable
              accessibilityLabel={`Join ${result.name}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: pending }}
              disabled={pending}
              onPress={() => {
                void join(result.uuid);
              }}
              style={pending && styles.disabled}
            >
              <Text style={styles.join}>Join</Text>
            </Pressable>
          </View>
        );
      })}
      <InlineError message={error} />
    </>
  );
}
