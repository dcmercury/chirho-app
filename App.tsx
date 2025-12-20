/**
 * ChiRho - Daily Office App
 * 
 * This is a minimal wrapper that loads the web app in a WebView.
 * The actual app logic lives in the Next.js web app.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';

// Your deployed web app URL
// Your deployed web app
const WEB_APP_URL = 'https://chirho.ai';

export default function App() {
  const [loading, setLoading] = React.useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <WebView
        source={{ uri: WEB_APP_URL }}
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
    </SafeAreaView>
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

