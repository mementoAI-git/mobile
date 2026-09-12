import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';

// Unused Expo template leftover. App entry is index.ts → expo-router/entry.
// Kept so environment tests can assert replay sampling is disabled.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,

  sendDefaultPii: false,

  // Enable Logs
  enableLogs: false,

  // Disable Session Replay to reduce background capture overhead and battery drain.
  // Error and crash reporting remain enabled for debugging and support.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
