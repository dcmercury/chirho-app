import { Pressable, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { fonts, radii, type ColorTokens } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/ThemeProvider";
import type { Community } from "../../lib/api";
import { GlassInput } from "./GlassInput";
import Svg, { Circle, Path } from "react-native-svg";

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      position: "relative",
    },
    input: {
      paddingRight: 36,
    },
    icon: {
      position: "absolute",
      right: 12,
      top: 0,
      bottom: 0,
      justifyContent: "center",
    },
    result: {
      padding: 12,
      borderRadius: radii.glass,
      backgroundColor: colors.glassFill,
      borderWidth: 1,
      borderColor: colors.glassBorderSoft,
    },
    resultPressed: {
      backgroundColor: colors.glassFillStrong,
      borderColor: colors.glassBorderRow,
    },
    name: {
      fontFamily: fonts.displayMedium,
      fontSize: 12.8,
      fontWeight: "500",
      color: colors.title,
    },
    location: {
      fontSize: 10.4,
      color: colors.muted,
      marginTop: 2,
      fontFamily: fonts.body,
    },
    selected: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: radii.glass,
      backgroundColor: colors.glassFillHover,
      borderWidth: 1,
      borderColor: colors.glassBorderSelected,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    change: {
      color: colors.muted,
      fontSize: 10.4,
      textDecorationLine: "underline",
      fontFamily: fonts.body,
    },
  });
}

export function CommunitySearch({
  query,
  onChangeQuery,
  searching,
}: {
  query: string;
  onChangeQuery: (q: string) => void;
  searching: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <GlassInput
        value={query}
        onChangeText={onChangeQuery}
        placeholder="Search by name, city, or zip..."
        autoFocus
        style={styles.input}
      />
      <View style={styles.icon}>
        {searching ? (
          <ActivityIndicator size="small" color={colors.mutedGhost} />
        ) : (
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Circle cx={11} cy={11} r={8} stroke={colors.mutedGhost} strokeWidth={2} />
            <Path
              d="m21 21-4.3-4.3"
              stroke={colors.mutedGhost}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        )}
      </View>
    </View>
  );
}

export function CommunityResult({
  community,
  onPress,
}: {
  community: Community;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}
    >
      <Text style={styles.name}>{community.name}</Text>
      <Text style={styles.location}>{community.location}</Text>
    </Pressable>
  );
}

export function CommunitySelected({
  name,
  location,
  onChange,
}: {
  name: string;
  location: string;
  onChange?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.selected}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.location}>{location}</Text>
      </View>
      {onChange ? (
        <Pressable onPress={onChange} hitSlop={8}>
          <Text style={styles.change}>Change</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
