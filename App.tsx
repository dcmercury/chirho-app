/**
 * ChiRho - Daily Office App
 * 
 * This is a minimal wrapper that loads the web app in a WebView.
 * The actual app logic lives in the Next.js web app.
 */

import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, ActivityIndicator, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Your deployed web app
const WEB_APP_URL = 'https://chirho.ai';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications and get token
async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission not granted for push notifications');
    return null;
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  
  return token.data;
}

export default function App() {
  const [loading, setLoading] = React.useState(true);
  const [pushToken, setPushToken] = React.useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  // Register for push notifications on mount
  useEffect(() => {
    registerForPushNotifications().then(token => {
      if (token) {
        setPushToken(token);
        console.log('Push token:', token);
      }
    });

    // Handle notification received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle user tapping on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      // Could navigate to specific content based on notification data
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  // Build URL with push token if available
  const webUrl = pushToken 
    ? `${WEB_APP_URL}?pushToken=${encodeURIComponent(pushToken)}`
    : WEB_APP_URL;

  return (
    <View style={styles.container}>
      {/* Translucent status bar - WebView goes edge-to-edge */}
      <StatusBar style="auto" translucent />
      
      <WebView
        ref={webViewRef}
        source={{ uri: webUrl }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        // Enable JavaScript
        javaScriptEnabled={true}
        // Enable DOM storage for localStorage
        domStorageEnabled={true}
        // Allow media playback without user gesture (for audio)
        mediaPlaybackRequiresUserAction={false}
        // Allow inline media playback
        allowsInlineMediaPlayback={true}
        // Pull to refresh
        pullToRefreshEnabled={true}
        // Bounce effect
        bounces={true}
      />

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8B4513" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF8F3',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FDF8F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

