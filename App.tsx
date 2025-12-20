/**
 * ChiRho - Daily Office App
 * Minimal WebView wrapper
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';

const WEB_APP_URL = 'https://chirho.ai';

export default function App() {
  const [loading, setLoading] = React.useState(true);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" translucent />
      
      <WebView
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />

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
