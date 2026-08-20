import { useCallback, useEffect, useRef } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import * as Device from "expo-device";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";
import {
  applyIncomingNotificationBadge,
  hrefFromNotificationData,
  registerForPushNotifications,
} from "../src/lib/push";
import { registerPushToken } from "../src/lib/api";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { colors } from "../src/theme/tokens";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
if (!publishableKey) {
  throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured");
}

function RootNavigator() {
  const { colors: themeColors, statusBarStyle } = useTheme();
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [fontsLoaded, fontError] = useFonts({
    Inter: Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    SpaceGrotesk: SpaceGrotesk_400Regular,
    "SpaceGrotesk-Medium": SpaceGrotesk_500Medium,
    "SpaceGrotesk-SemiBold": SpaceGrotesk_600SemiBold,
    "SpaceGrotesk-Bold": SpaceGrotesk_700Bold,
    JetBrainsMono: JetBrainsMono_400Regular,
    "JetBrainsMono-Medium": JetBrainsMono_500Medium,
  });
  const fontsReady = fontsLoaded || !!fontError;

  const hideSplash = useCallback(() => {
    if (!fontsReady) return;
    SplashScreen.hideAsync();
  }, [fontsReady]);

  useEffect(() => {
    hideSplash();
  }, [hideSplash]);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      const pushToken = await registerForPushNotifications({
        requestPermission: false,
      });
      if (!pushToken || cancelled) return;
      const sessionToken = await getTokenRef.current();
      if (!sessionToken || cancelled) return;
      try {
        await registerPushToken(
          pushToken,
          Platform.OS === "ios" ? "ios" : "android",
          sessionToken,
        );
      } catch (err) {
        console.warn("Push token registration failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || Platform.OS === "web" || !Device.isDevice) return;
    let cancelled = false;
    let remove = () => {};

    import("expo-notifications").then((Notifications) => {
      if (cancelled) return;
      const openNotification = (
        response: Awaited<
          ReturnType<typeof Notifications.getLastNotificationResponseAsync>
        >,
      ) => {
        const href = hrefFromNotificationData(
          response?.notification.request.content.data as
            | Record<string, unknown>
            | undefined,
        );
        if (href) router.push(href);
      };

      Notifications.getLastNotificationResponseAsync().then(openNotification);
      const responseSubscription =
        Notifications.addNotificationResponseReceivedListener(openNotification);
      const receivedSubscription =
        Notifications.addNotificationReceivedListener((notification) => {
          void applyIncomingNotificationBadge(notification);
        });
      remove = () => {
        responseSubscription.remove();
        receivedSubscription.remove();
      };
    });

    return () => {
      cancelled = true;
      remove();
    };
  }, [isSignedIn, router]);

  if (!fontsReady || !authLoaded) {
    return (
      <View
        onLayout={hideSplash}
        style={{
          flex: 1,
          backgroundColor: colors.splash,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={themeColors.splashSpinner} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: themeColors.canvas } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider>
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      __experimental_disableNativeClientSync
    >
      <RootNavigator />
    </ClerkProvider>
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
