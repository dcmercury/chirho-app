import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useAuth, useClerk } from "@clerk/expo";
import {
  deleteAccount,
  deleteLovedOne,
  joinCommunity,
  leaveGroup,
  searchCommunities,
  setActiveCommunity,
  updateAccountName,
  updateNotificationPreference,
  updateProfile,
  uploadAvatar,
  type Community,
} from "../../lib/api";
import { resolveImage } from "../../lib/assets";
import { colors, fonts } from "../../theme/tokens";
import type {
  DailyPrayerSettings,
  HomeCommunity,
  HomeGroup,
  HomeProfile,
} from "../../types/home";

const voiceIds: Record<string, string> = {
  "american-priest": "MCkmNHsdG826UovZqqSA",
  "british-priest": "RsgZlqabeFOyHtTfpERU",
  george: "JBFqnCBsd6RMkjVDRZzb",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  bill: "pqHfZKP75CvOlQylNhV4",
  james: "ZQe5CZNOzWyzPSCn5a3c",
  nicole: "piTKgcLEGmPE4e6mEKli",
  josh: "TxGEqnHWrfWFTfGW9XjX",
  michael: "flq6f7yk4E4fJM5XTYuZ",
  charlotte: "XB0fDUnXU5powFXDhCwa",
};

interface ProfileDrawerProps {
  visible: boolean;
  profile: HomeProfile | null;
  groups: HomeGroup[];
  community: HomeCommunity | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

export function ProfileDrawer({
  visible,
  profile,
  groups,
  community,
  onClose,
  onChanged,
}: ProfileDrawerProps) {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [communityQuery, setCommunityQuery] = useState("");
  const [communityResults, setCommunityResults] = useState<Community[]>([]);

  useEffect(() => {
    setFirstName(profile?.account.firstName || "");
    setLastName(profile?.account.lastName || "");
  }, [profile]);

  const mutate = async (operation: (token: string) => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      await operation(token);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save changes");
    } finally {
      setSaving(false);
    }
  };

  const dailyPayload = (
    period: "morning" | "evening",
    next: DailyPrayerSettings,
  ) => {
    if (!profile) return null;
    const serialize = (
      value: DailyPrayerSettings,
      suffix: "AM" | "PM",
    ) => ({
      enabled: value.enabled,
      time: value.enabled
        ? `${value.hour}:${value.minutes.padStart(2, "0")}${suffix}`
        : null,
      timezone: value.enabled ? value.timezone : null,
      textOnly: value.textOnly,
      prayeruuid: null,
    });
    return {
      morning: serialize(
        period === "morning" ? next : profile.dailyPrayers.morning,
        "AM",
      ),
      evening: serialize(
        period === "evening" ? next : profile.dailyPrayers.evening,
        "PM",
      ),
    };
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.7,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    const mimeType = asset.mimeType || "image/jpeg";
    await mutate((token) =>
      uploadAvatar(`data:${mimeType};base64,${asset.base64}`, token),
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This permanently removes your account and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            mutate(deleteAccount).then(async () => {
              await signOut();
            }),
        },
      ],
    );
  };

  const findCommunities = async () => {
    if (!communityQuery.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const result = await searchCommunities(communityQuery);
      setCommunityResults(result.communities);
      if (result.error) setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search communities");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={onClose} style={styles.handle} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            disabled={saving}
            onPress={pickAvatar}
            style={styles.avatarButton}
          >
            <Image
              source={resolveImage(profile.avatar)}
              style={styles.avatar}
              contentFit="cover"
            />
            <Text style={styles.avatarEdit}>EDIT</Text>
          </Pressable>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.memberSince}>{profile.memberSince}</Text>

          <View style={styles.stats}>
            {profile.stats.map((stat) => (
              <View key={stat.label} style={styles.stat}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <Section title="Account">
            <TextInput
              editable={!saving}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={firstName}
            />
            <TextInput
              editable={!saving}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={lastName}
            />
            <Action
              disabled={saving}
              label="Save name"
              onPress={() =>
                mutate((token) =>
                  updateAccountName(firstName, lastName, token),
                )
              }
            />
            <InfoRow label="Phone" value={profile.account.phone} />
            <InfoRow label="Email" value={profile.account.email} />
          </Section>

          <Section title="Tradition">
            <View style={styles.pills}>
              {profile.traditions.options.map((option) => (
                <Pill
                  key={option.id}
                  active={option.id === profile.traditions.selected}
                  label={option.label}
                  onPress={() =>
                    mutate((token) =>
                      updateProfile(
                        { preferences: { defaultTradition: option.id } },
                        token,
                      ),
                    )
                  }
                />
              ))}
            </View>
          </Section>

          <Section title="Voice">
            <View style={styles.pills}>
              {profile.voices.options.map((option) => (
                <Pill
                  key={option.id}
                  active={option.id === profile.voices.selected}
                  label={option.label}
                  onPress={() =>
                    mutate((token) =>
                      updateProfile(
                        {
                          preferences: {
                            defaultVoice: voiceIds[option.id] || option.id,
                          },
                        },
                        token,
                      ),
                    )
                  }
                />
              ))}
            </View>
          </Section>

          <Section title="Daily prayers">
            {(["morning", "evening"] as const).map((period) => {
              const value = profile.dailyPrayers[period];
              return (
                <View key={period} style={styles.settingGroup}>
                  <ToggleRow
                    disabled={saving}
                    label={`${period[0].toUpperCase()}${period.slice(1)} prayer`}
                    onValueChange={(enabled) => {
                      const payload = dailyPayload(period, {
                        ...value,
                        enabled,
                      });
                      if (payload) {
                        mutate((token) =>
                          updateProfile(
                            { preferences: { dailyPrayers: payload } },
                            token,
                          ),
                        );
                      }
                    }}
                    value={value.enabled}
                  />
                  <ToggleRow
                    disabled={saving || !value.enabled}
                    label="Text only"
                    onValueChange={(textOnly) => {
                      const payload = dailyPayload(period, {
                        ...value,
                        textOnly,
                      });
                      if (payload) {
                        mutate((token) =>
                          updateProfile(
                            { preferences: { dailyPrayers: payload } },
                            token,
                          ),
                        );
                      }
                    }}
                    value={value.textOnly}
                  />
                  <Text style={styles.settingMeta}>
                    {value.hour}:{value.minutes.padStart(2, "0")} · {value.timezone}
                  </Text>
                </View>
              );
            })}
          </Section>

          {profile.notifications.length ? (
            <Section title="Notifications">
              {profile.notifications.map((item) => (
                <ToggleRow
                  key={item.key}
                  disabled={saving || item.adminDisabled}
                  label={item.label}
                  onValueChange={(enabled) =>
                    mutate((token) =>
                      updateNotificationPreference(item.key, enabled, token),
                    )
                  }
                  value={item.enabled}
                />
              ))}
            </Section>
          ) : null}

          {profile.privacy.length ? (
            <Section title="Privacy">
              {profile.privacy.map((item) => (
                <ToggleRow
                  key={item.key}
                  disabled={saving}
                  label={item.label}
                  onValueChange={(enabled) =>
                    mutate((token) =>
                      updateProfile({ privacy: { [item.key]: enabled } }, token),
                    )
                  }
                  value={item.enabled}
                />
              ))}
            </Section>
          ) : null}

          <Section title="Loved ones">
            {profile.managedLovedOnes.length ? (
              profile.managedLovedOnes.map((person) => (
                <View key={person.id} style={styles.manageRow}>
                  <View style={styles.manageCopy}>
                    <Text style={styles.manageName}>{person.firstName}</Text>
                    <Text style={styles.manageMeta}>
                      {person.categories.join(", ") || "No categories"}
                    </Text>
                  </View>
                  <Pressable
                    disabled={saving}
                    onPress={() =>
                      mutate((token) => deleteLovedOne(person.id, token))
                    }
                  >
                    <Text style={styles.remove}>Remove</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>No loved ones yet.</Text>
            )}
          </Section>

          <Section title="Community and groups">
            <InfoRow label="Community" value={community?.name || "None"} />
            {community ? (
              <Pressable
                disabled={saving}
                onPress={() =>
                  mutate((token) => setActiveCommunity(null, token))
                }
              >
                <Text style={styles.remove}>Leave active community</Text>
              </Pressable>
            ) : null}
            <View style={styles.communitySearch}>
              <TextInput
                editable={!saving}
                onChangeText={setCommunityQuery}
                onSubmitEditing={findCommunities}
                placeholder="Find a church or community"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.communityInput]}
                value={communityQuery}
              />
              <Pressable
                disabled={saving || !communityQuery.trim()}
                onPress={findCommunities}
                style={styles.searchButton}
              >
                <Text style={styles.searchText}>Search</Text>
              </Pressable>
            </View>
            {communityResults.map((result) => (
              <View key={result.uuid} style={styles.manageRow}>
                <View style={styles.manageCopy}>
                  <Text style={styles.manageName}>{result.name}</Text>
                  <Text style={styles.manageMeta}>{result.location}</Text>
                </View>
                <Pressable
                  disabled={saving}
                  onPress={() =>
                    mutate(async (token) => {
                      await joinCommunity(result.uuid, token);
                      await setActiveCommunity(result.uuid, token);
                      setCommunityResults([]);
                      setCommunityQuery("");
                    })
                  }
                >
                  <Text style={styles.join}>Join</Text>
                </Pressable>
              </View>
            ))}
            {groups.map((group) => (
              <View key={group.groupuuid} style={styles.manageRow}>
                <Text style={styles.manageName}>{group.name}</Text>
                <Pressable
                  disabled={saving}
                  onPress={() =>
                    mutate((token) => leaveGroup(group.groupuuid, token))
                  }
                >
                  <Text style={styles.remove}>Leave</Text>
                </Pressable>
              </View>
            ))}
          </Section>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Action
            disabled={saving}
            label="Sign out"
            onPress={() => signOut()}
          />
          <Pressable
            disabled={saving}
            onPress={confirmDeleteAccount}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>Delete account</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoValue}>{label}</Text>
      <Switch
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: colors.glassBorder, true: colors.accent }}
        value={value}
      />
    </View>
  );
}

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Action({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, disabled && styles.disabled]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  avatarButton: { alignSelf: "center", alignItems: "center" },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderColor: colors.glassBorderStrong,
    borderWidth: 2,
  },
  avatarEdit: {
    color: colors.accent,
    fontFamily: fonts.monoMedium,
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 7,
  },
  name: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 27,
    textAlign: "center",
    marginTop: 10,
  },
  memberSince: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: "center",
    marginTop: 3,
  },
  stats: {
    flexDirection: "row",
    marginTop: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.glassBorder,
  },
  stat: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statValue: {
    color: colors.white,
    fontFamily: fonts.displayMedium,
    fontSize: 20,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: 3,
    textTransform: "uppercase",
  },
  section: {
    marginTop: 28,
    gap: 10,
  },
  sectionTitle: {
    color: colors.muted,
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 14,
    paddingHorizontal: 14,
  },
  communitySearch: { flexDirection: "row", gap: 8 },
  communityInput: { flex: 1 },
  searchButton: {
    minWidth: 68,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  searchText: { color: colors.black, fontFamily: fonts.bodyMedium, fontSize: 11 },
  infoRow: {
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  infoLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  infoValue: { color: colors.white, fontFamily: fonts.body, fontSize: 12 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  pill: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: "rgba(249,115,22,0.14)",
    borderColor: "rgba(249,115,22,0.45)",
  },
  pillText: { color: colors.mutedSoft, fontFamily: fonts.body, fontSize: 11 },
  pillTextActive: { color: colors.accent },
  settingGroup: { marginBottom: 8 },
  settingMeta: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 9,
    marginTop: 7,
  },
  manageRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  manageCopy: { flex: 1 },
  manageName: { color: colors.white, fontFamily: fonts.bodyMedium, fontSize: 13 },
  manageMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  remove: { color: colors.error, fontFamily: fonts.body, fontSize: 11 },
  join: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 11 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  error: { color: colors.error, fontFamily: fonts.body, fontSize: 12, marginTop: 20 },
  action: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  actionText: { color: colors.black, fontFamily: fonts.displayMedium, fontSize: 14 },
  deleteButton: { alignItems: "center", paddingVertical: 20 },
  deleteText: { color: colors.error, fontFamily: fonts.body, fontSize: 12 },
  disabled: { opacity: 0.4 },
});
