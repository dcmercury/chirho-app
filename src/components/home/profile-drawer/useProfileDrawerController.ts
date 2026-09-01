import { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useAuth, useClerk } from "@clerk/expo";
import {
  deleteAccount,
  deleteLovedOne,
  deletePrayerFocus,
  joinCommunity,
  leaveGroup,
  registerPushToken,
  searchCommunities,
  selectDashboardBackground,
  sendTestNotification,
  setActiveCommunity,
  updateAccountName,
  updateAccountGender,
  updateLovedOne,
  updateNotificationPreference,
  updatePrayerFocus,
  updateProfile,
  uploadAvatar,
  uploadDashboardBackground,
  type Community,
} from "../../../lib/api";
import { backgroundIdForUrl } from "../../../lib/backgroundLibrary";
import { registerForPushNotifications } from "../../../lib/push";
import { setBackgroundMusicEnabled, setBackgroundMusicUrl } from "../../../lib/backgroundMusicPreference";
import { prepareLovedOnePhoto } from "../../../lib/lovedOnePhoto";
import { useTheme } from "../../../theme/ThemeProvider";
import type { Appearance } from "../../../theme/tokens";
import type {
  DailyPrayerSettings,
  HomeProfile,
  LovedOneGender,
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
  const { setAppearance } = useTheme();
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

  const enablePushIfNeeded = async (token: string) => {
    const pushToken = await registerForPushNotifications({
      requestPermission: true,
    });
    if (!pushToken) return;
    await registerPushToken(
      pushToken,
      Platform.OS === "ios" ? "ios" : "android",
      token,
    ).catch(() => undefined);
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

  const saveAccountGender = (gender: LovedOneGender) =>
    mutate(
      "account-gender",
      (token) => updateAccountGender(gender, token),
      "Unable to save gender",
    );

  const selectTradition = (tradition: string) =>
    mutate("tradition", (token) =>
      updateProfile({ preferences: { defaultTradition: tradition } }, token),
    );

  const setPrayerLength = (prayerLength: HomeProfile["prayerLength"]) =>
    mutate("prayer-length", (token) =>
      updateProfile({ preferences: { prayerLength } }, token),
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
    mutate(`daily-${period}`, async (token) => {
      await updateProfile(
        {
          preferences: {
            dailyPrayers: serializeDailyPrayerPayload(dailyPrayers, period, next),
          },
        },
        token,
      );
      if (next.enabled) await enablePushIfNeeded(token);
    });

  const setNotification = (key: string, enabled: boolean) =>
    mutate(`notification:${key}`, async (token) => {
      await updateNotificationPreference(key, enabled, token);
      if (enabled) await enablePushIfNeeded(token);
    });

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

  const musicIntentRef = useRef<{
    enabled: boolean;
    musicuuid?: string;
    url?: string;
  } | null>(null);

  const flushBackgroundMusic = async () => {
    if (!begin("background-music")) return;
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      while (musicIntentRef.current) {
        const next = musicIntentRef.current;
        musicIntentRef.current = null;
        setBackgroundMusicEnabled(next.enabled);
        if (next.url) setBackgroundMusicUrl(next.url);
        await updateProfile(
          {
            preferences: {
              backgroundMusicEnabled: next.enabled,
              ...(next.musicuuid !== undefined
                ? { backgroundMusicId: next.musicuuid }
                : {}),
            },
          },
          token,
        );
      }
      await refreshProfile();
    } catch (error) {
      setOperationError("background-music", error, "Unable to save changes");
    } finally {
      finish("background-music");
      if (musicIntentRef.current) void flushBackgroundMusic();
    }
  };

  const setBackgroundMusic = (enabled: boolean) => {
    setBackgroundMusicEnabled(enabled);
    musicIntentRef.current = {
      enabled,
      musicuuid: musicIntentRef.current?.musicuuid,
      url: musicIntentRef.current?.url,
    };
    void flushBackgroundMusic();
  };

  const selectBackgroundMusic = (musicuuid: string, musicUrl: string) => {
    setBackgroundMusicEnabled(true);
    setBackgroundMusicUrl(musicUrl);
    musicIntentRef.current = {
      enabled: true,
      musicuuid,
      url: musicUrl,
    };
    void flushBackgroundMusic();
  };

  const setTheme = (appearance: Appearance) => {
    setAppearance(appearance);
    return mutate("theme", (token) =>
      updateProfile({ preferences: { theme: appearance } }, token),
    );
  };

  const selectHomeBackground = (imageUrl: string, current: string[]) =>
    mutate(
      "dashboard-background:select",
      (token) =>
        selectDashboardBackground(imageUrl, current, token, {
          backgrounduuid: backgroundIdForUrl(imageUrl),
        }),
      "Unable to set this background.",
    );

  const uploadHomeBackground = (current: string[]) =>
    mutate(
      "dashboard-background:upload",
      async (token) => {
        const picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 1,
        });
        if (picked.canceled || !picked.assets[0]) return;
        const imageData = await prepareLovedOnePhoto(picked.assets[0]);
        await uploadDashboardBackground(imageData, current, token);
      },
      "Unable to upload this background.",
    );

  const setPrivacy = (key: string, enabled: boolean) =>
    mutate(`privacy:${key}`, (token) =>
      updateProfile({ privacy: { [key]: enabled } }, token),
    );

  const setLovedOneGender = (id: string, gender: LovedOneGender) =>
    mutate(
      `loved-one:${id}`,
      (token) => updateLovedOne(id, { gender }, token),
      "Unable to save gender",
    );

  const confirmRemoveLovedOne = (id: string, firstName: string) => {
    Alert.alert(
      `Remove ${firstName}?`,
      "This removes them from the people you pray for.",
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

  const confirmLeaveCommunity = (name: string, onLeft?: () => void) => {
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
            ).then((ok) => {
              if (ok) onLeft?.();
            });
          },
        },
      ],
    );
  };

  const confirmLeaveGroup = (
    groupuuid: string,
    name: string,
    onLeft?: () => void,
  ) => {
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
          ).then((ok) => {
            if (ok) onLeft?.();
          });
        },
      },
    ]);
  };

  const signOutAccount = async (): Promise<boolean> => {
    const key = "sign-out";
    if (!begin(key)) return false;
    try {
      await signOut();
      void Image.clearMemoryCache();
      void Image.clearDiskCache();
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
    saveAccountGender,
    selectTradition,
    setPrayerLength,
    selectVoice,
    setBackgroundMusic,
    selectBackgroundMusic,
    setTheme,
    selectHomeBackground,
    uploadHomeBackground,
    updateDailyPrayer,
    setNotification,
    testNotification,
    setPrivacy,
    setLovedOneGender,
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
