import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import type { Href } from "expo-router";

const IOS_NOTIFICATION_PERMISSIONS = {
  allowAlert: true,
  allowBadge: true,
  allowSound: true,
} as const;

export function configureNotificationHandler() {
  if (Platform.OS === "web") return;
  void import("expo-notifications").then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  });
}

configureNotificationHandler();

export async function applyIncomingNotificationBadge(notification?: {
  request: { content: { badge?: number | null } };
}): Promise<void> {
  if (Platform.OS === "web") return;
  const Notifications = await import("expo-notifications");
  const payloadBadge = notification?.request.content.badge;
  if (typeof payloadBadge === "number" && payloadBadge >= 0) {
    await Notifications.setBadgeCountAsync(payloadBadge);
    return;
  }
  const current = await Notifications.getBadgeCountAsync();
  await Notifications.setBadgeCountAsync(current + 1);
}

function isNotificationPermissionGranted(
  Notifications: typeof import("expo-notifications"),
  settings: Awaited<
    ReturnType<typeof import("expo-notifications").getPermissionsAsync>
  >,
): boolean {
  return (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export function hrefFromNotificationData(
  data: Record<string, unknown> | undefined | null,
): Href | null {
  if (!data) return null;

  if (typeof data.invitationToken === "string" && data.invitationToken) {
    return {
      pathname: "/groups/invite/[token]",
      params: { token: data.invitationToken },
    };
  }
  if (typeof data.deckuuid === "string" && data.deckuuid) {
    return `/(app)/prayer-decks/${data.deckuuid}` as Href;
  }
  if (typeof data.prayeruuid === "string" && data.prayeruuid) {
    return {
      pathname: "/(app)/prayers/[prayeruuid]",
      params: { prayeruuid: data.prayeruuid },
    };
  }
  if (typeof data.groupuuid === "string" && data.groupuuid) {
    return {
      pathname: "/(app)/groups/[groupuuid]",
      params: {
        groupuuid: data.groupuuid,
        ...(typeof data.messageId === "string" && data.messageId
          ? { messageId: data.messageId }
          : {}),
      },
    };
  }
  if (typeof data.url === "string") {
    return hrefFromTrustedNotificationUrl(data.url);
  }
  return null;
}

export function hrefFromTrustedNotificationUrl(value: string): Href | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      (url.hostname !== "chirho.ai" && url.hostname !== "www.chirho.ai")
    ) {
      return null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "groups" && parts[1] === "invite" && parts[2]) {
      return {
        pathname: "/groups/invite/[token]",
        params: { token: parts[2] },
      };
    }
    if (parts[0] === "groups" && parts[1]) {
      return {
        pathname: "/(app)/groups/[groupuuid]",
        params: { groupuuid: parts[1] },
      };
    }
    if (parts[0] === "prayer-decks" && parts[1]) {
      return `/(app)/prayer-decks/${parts[1]}` as Href;
    }
    if (parts[0] === "prayercards" && parts[1]) {
      return {
        pathname: "/(app)/prayers/[prayeruuid]",
        params: { prayeruuid: parts[1] },
      };
    }
    if (parts[0] === "prayers" && parts[1] === "daily" && parts[2]) {
      return {
        pathname: "/(app)/prayers/[prayeruuid]",
        params: { prayeruuid: parts[2] },
      };
    }
    if (parts[0] === "prayers" && parts[1]) {
      return {
        pathname: "/(app)/prayers/[prayeruuid]",
        params: { prayeruuid: parts[1] },
      };
    }
    if (parts[0] === "mobile" && parts[1] === "prayers" && parts[2]) {
      return {
        pathname: "/(app)/prayers/[prayeruuid]",
        params: { prayeruuid: parts[2] },
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function registerForPushNotifications(
  options: { requestPermission?: boolean } = {},
): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const Notifications = await import("expo-notifications");

  configureNotificationHandler();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let permission = existing;

  if (
    !isNotificationPermissionGranted(Notifications, existing) &&
    !options.requestPermission
  ) {
    return null;
  }

  if (
    options.requestPermission ||
    existing.ios?.allowsBadge === false
  ) {
    permission = await Notifications.requestPermissionsAsync({
      ios: IOS_NOTIFICATION_PERMISSIONS,
    });
  }

  if (!isNotificationPermissionGranted(Notifications, permission)) {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    console.error("EAS projectId not found in app config");
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (error) {
    console.error("Failed to get Expo push token:", error);
    return null;
  }
}
