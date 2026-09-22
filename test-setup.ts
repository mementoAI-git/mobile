import { mock } from 'bun:test';

(globalThis as any).__DEV__ = true;

mock.module('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj.ios },
  StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  Dimensions: { get: () => ({ width: 393, height: 852 }) },
  TurboModuleRegistry: { get: () => null, getEnforcing: () => null },
  NativeModules: {},
  NativeEventEmitter: class {
    addListener = () => ({ remove: () => {} });
    removeAllListeners = () => {};
    removeSubscription = () => {};
  },
  // Add other react-native mock implementations as needed
}));

mock.module('expo-apple-authentication', () => ({
  isAvailableAsync: mock(async () => true),
  signInAsync: mock(async () => ({})),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

mock.module('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: mock(() => {}),
    hasPlayServices: mock(async () => true),
    signIn: mock(async () => ({ type: 'success', data: { idToken: 'test' } })),
    signOut: mock(async () => null),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

