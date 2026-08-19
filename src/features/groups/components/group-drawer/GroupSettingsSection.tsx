import { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fonts } from "../../../../theme/tokens";
import type { GroupSettings } from "../../types";
import {
  GroupDrawerError,
  GroupDrawerPill,
  GroupDrawerSection,
} from "./GroupDrawerControls";

const TRADITIONS = ["Anglican", "Catholic", "Lutheran", "Orthodox"] as const;

interface GroupSettingsSectionProps {
  settings: GroupSettings;
  traditionPending: boolean;
  invitesPending: boolean;
  error?: string;
  onSelectTradition: (tradition: string) => void;
  onMemberInvitesChange: (enabled: boolean) => void;
}

export function GroupSettingsSection({
  settings,
  traditionPending,
  invitesPending,
  error,
  onSelectTradition,
  onMemberInvitesChange,
}: GroupSettingsSectionProps) {
  const allowsInvites = settings.allowMemberInvites === true;
  const progress = useRef(new Animated.Value(allowsInvites ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: allowsInvites ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [allowsInvites, progress]);

  return (
    <GroupDrawerSection title="Group settings">
      <Text style={styles.label}>Tradition</Text>
      <View style={styles.traditions}>
        {TRADITIONS.map((tradition) => (
          <View key={tradition} style={styles.tradition}>
            <GroupDrawerPill
              disabled={traditionPending}
              label={tradition}
              onPress={() => onSelectTradition(tradition)}
              selected={
                settings.tradition?.toLowerCase() === tradition.toLowerCase()
              }
            />
          </View>
        ))}
      </View>
      <View style={styles.toggleRow}>
        <View style={styles.toggleCopy}>
          <Text style={styles.toggleLabel}>Members can invite</Text>
          <Text style={styles.toggleHint}>
            Allow active members to invite others.
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Members can invite"
          accessibilityRole="switch"
          accessibilityState={{
            checked: allowsInvites,
            disabled: invitesPending,
            busy: invitesPending,
          }}
          disabled={invitesPending}
          onPress={() => onMemberInvitesChange(!allowsInvites)}
          style={({ pressed }) => [
            styles.toggleTouch,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.toggleTrack,
              allowsInvites && styles.toggleTrackActive,
              invitesPending && styles.disabled,
            ]}
          >
            <Animated.View
              style={[
                styles.toggleThumb,
                {
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 12],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </Pressable>
      </View>
      <GroupDrawerError message={error} />
    </GroupDrawerSection>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.mutedStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  traditions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  tradition: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  toggleRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  toggleCopy: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    color: colors.mutedStrong,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  toggleHint: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 9,
    marginTop: 2,
  },
  toggleTouch: {
    width: 44,
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  toggleTrack: {
    width: 32,
    height: 20,
    borderRadius: 10,
    padding: 2,
    backgroundColor: colors.glassFillStrong,
  },
  toggleTrackActive: {
    backgroundColor: colors.accent,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fffaf5",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.28,
    shadowRadius: 2,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.32,
  },
});
