import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth, useClerk } from "@clerk/expo";
import {
  deleteAccount,
  deleteLovedOne,
  deletePrayerFocus,
  joinCommunity,
  leaveGroup,
  searchCommunities,
  sendTestNotification,
  setActiveCommunity,
  updateAccountName,
  updateNotificationPreference,
  updatePrayerFocus,
  updateProfile,
  uploadAvatar,
  type Community,
} from "../../../lib/api";
import type {
  DailyPrayerSettings,
  HomeProfile,
  PrayerFocus,
  PrayerFocusInput,
} from "../../../types/home";
import {
  resolveVoiceId,
  serializeDailyPrayerPayload,
  type DailyPrayerPeriod,
} from "./profileUtilities";

type Operation = (token: string) => Promise<void>;

export function useProfileDrawerController(
  visible: boolean,
  onChanged: () => Promise<void>,
) {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const activeKeys = useRef(new Set<string>());
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const refreshQueue = useRef<Promise<void>>(Promise.resolve());
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (!visible) setErrors({});
  }, [visible]);

  const begin = (key: string) => {
    if (activeKeys.current.has(key)) return false;
    activeKeys.current.add(key);
    setPending((current) => ({ ...current, [key]: true }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    return true;
  };

  const finish = (key: string) => {
    activeKeys.current.delete(key);
    setPending((current) => ({ ...current, [key]: false }));
  };

  const setOperationError = (key: string, error: unknown, fallback: string) => {
    if (!visibleRef.current) return;
    setErrors((current) => ({
      ...current,
      [key]: error instanceof Error ? error.message : fallback,
    }));
  };

  const refreshProfile = () => {
    const nextRefresh = refreshQueue.current
      .catch(() => undefined)
      .then(onChanged);
    refreshQueue.current = nextRefresh;
    return nextRefresh;
  };

  const mutate = async (
    key: string,
    operation: Operation,
    fallback = "Unable to save changes",
    refreshAfter = true,
  ): Promise<boolean> => {
    if (!begin(key)) return false;
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      await operation(token);
      if (refreshAfter) await refreshProfile();
      return true;
    } catch (error) {
      setOperationError(key, error, fallback);
      return false;
    } finally {
      finish(key);
    }
  };

  const pickAvatar = async () => {
    if (activeKeys.current.has("avatar")) return;
    try {
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
      await mutate(
        "avatar",
        (token) => uploadAvatar(`data:${mimeType};base64,${asset.base64}`, token),
        "Unable to update your profile photo",
      );
    } catch (error) {
      setOperationError(
        "avatar",
        error,
        "Unable to update your profile photo",
      );
    }
  };

  const saveAccount = (firstName: string, lastName: string) =>
    mutate(
      "account",
      (token) => updateAccountName(firstName, lastName, token),
      "Unable to update your name",
    );

  const selectTradition = (tradition: string) =>
    mutate("tradition", (token) =>
      updateProfile({ preferences: { defaultTradition: tradition } }, token),
    );

  const selectVoice = (voice: string) =>
    mutate("voice", (token) =>
      updateProfile(
        { preferences: { defaultVoice: resolveVoiceId(voice) } },
        token,
      ),
    );

  const updateDailyPrayer = (
    dailyPrayers: HomeProfile["dailyPrayers"],
    period: DailyPrayerPeriod,
    next: DailyPrayerSettings,
  ) =>
    mutate(`daily-${period}`, (token) =>
      updateProfile(
        {
          preferences: {
            dailyPrayers: serializeDailyPrayerPayload(dailyPrayers, period, next),
          },
        },
        token,
      ),
    );

  const setNotification = (key: string, enabled: boolean) =>
    mutate(`notification:${key}`, (token) =>
      updateNotificationPreference(key, enabled, token),
    );

  const testNotification = async (key: string, label: string) => {
    let confirmation = "Test notification sent.";
    const sent = await mutate(
      `notification-test:${key}`,
      async (token) => {
        confirmation = await sendTestNotification(key, token);
      },
      `Unable to test ${label}`,
      false,
    );
    if (sent && visibleRef.current) {
      Alert.alert("Test sent", confirmation);
    }
  };

  const setPrivacy = (key: string, enabled: boolean) =>
    mutate(`privacy:${key}`, (token) =>
      updateProfile({ privacy: { [key]: enabled } }, token),
    );

  const confirmRemoveLovedOne = (id: string, firstName: string) => {
    Alert.alert(
      `Remove ${firstName}?`,
      "This removes them from your loved ones.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void mutate(
              `loved-one:${id}`,
              (token) => deleteLovedOne(id, token),
              `Unable to remove ${firstName}`,
            );
          },
        },
      ],
    );
  };

  const savePrayerFocus = (focus: PrayerFocus, input: PrayerFocusInput) =>
    mutate(
      `prayer-focus:${focus.focusuuid}`,
      (token) => updatePrayerFocus(focus.focusuuid, input, token).then(() => undefined),
      `Unable to update ${focus.title}`,
    );

  const confirmRemovePrayerFocus = (focusuuid: string, title: string) => {
    Alert.alert(
      `Remove ${title}?`,
      "This removes the focus from future daily prayer decks.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void mutate(
              `prayer-focus:${focusuuid}`,
              (token) => deletePrayerFocus(focusuuid, token),
              `Unable to remove ${title}`,
            );
          },
        },
      ],
    );
  };

  const searchCommunity = async (query: string): Promise<Community[]> => {
    const key = "community:search";
    if (!begin(key)) return [];
    try {
      const result = await searchCommunities(query);
      if (result.error && visibleRef.current) {
        setErrors((current) => ({ ...current, [key]: result.error }));
      }
      return result.communities;
    } catch (error) {
      setOperationError(key, error, "Unable to search communities");
      return [];
    } finally {
      finish(key);
    }
  };

  const joinAndActivateCommunity = (communityuuid: string) =>
    mutate(
      "community:join",
      async (token) => {
        await joinCommunity(communityuuid, token);
        await setActiveCommunity(communityuuid, token);
      },
      "Unable to join this community",
    );

  const confirmLeaveCommunity = (name: string) => {
    Alert.alert(
      `Leave ${name}?`,
      "This removes it as your active community.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            void mutate(
              "community:leave",
              (token) => setActiveCommunity(null, token),
              "Unable to leave this community",
            );
          },
        },
      ],
    );
  };

  const confirmLeaveGroup = (groupuuid: string, name: string) => {
    Alert.alert(`Leave ${name}?`, "You will leave this prayer group.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          void mutate(
            `group:${groupuuid}`,
            (token) => leaveGroup(groupuuid, token),
            `Unable to leave ${name}`,
          );
        },
      },
    ]);
  };

  const signOutAccount = async (): Promise<boolean> => {
    const key = "sign-out";
    if (!begin(key)) return false;
    try {
      await signOut();
      return true;
    } catch (error) {
      setOperationError(key, error, "Unable to sign out");
      return false;
    } finally {
      finish(key);
    }
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
          onPress: () => {
            void mutate(
              "account:delete",
              deleteAccount,
              "Unable to delete account",
              false,
            ).then((deleted) => {
              if (deleted) void signOutAccount();
            });
          },
        },
      ],
    );
  };

  return {
    pending,
    errors,
    pickAvatar,
    saveAccount,
    selectTradition,
    selectVoice,
    updateDailyPrayer,
    setNotification,
    testNotification,
    setPrivacy,
    confirmRemoveLovedOne,
    savePrayerFocus,
    confirmRemovePrayerFocus,
    searchCommunity,
    joinAndActivateCommunity,
    confirmLeaveCommunity,
    confirmLeaveGroup,
    confirmDeleteAccount,
    signOutAccount,
  };
}

export type ProfileDrawerController = ReturnType<
  typeof useProfileDrawerController
>;
