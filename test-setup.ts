import { mock } from 'bun:test';
import { plugin } from 'bun';

// Metro bundles audio assets; in tests a required clip is just its path.
plugin({
  name: 'audio-assets',
  setup(build) {
    build.onLoad({ filter: /\.(mp3|wav|m4a)$/ }, (args) => ({ exports: { default: args.path }, loader: 'object' }));
  },
});

(globalThis as any).__DEV__ = true;
if (!(globalThis as any).expo) {
  (globalThis as any).expo = {
    EventEmitter: class {
      addListener = () => ({ remove: () => {} });
      removeAllListeners = () => {};
      removeSubscription = () => {};
      emit = () => {};
    },
    modules: {},
  };
}

const defaultComponent = (props: any) => props.children ?? null;

mock.module('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj.ios },
  StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  Dimensions: { get: () => ({ width: 393, height: 852 }) },
  PixelRatio: { roundToNearestPixel: (n: number) => n, getFontScale: () => 1, get: () => 3 },
  TurboModuleRegistry: { get: () => null, getEnforcing: () => null },
  NativeModules: {},
  NativeEventEmitter: class {
    addListener = () => ({ remove: () => {} });
    removeAllListeners = () => {};
    removeSubscription = () => {};
  },
  useWindowDimensions: () => ({ width: 393, height: 852, scale: 3, fontScale: 1 }),
  View: defaultComponent,
  Text: defaultComponent,
  TouchableOpacity: defaultComponent,
  Pressable: defaultComponent,
  Image: defaultComponent,
  ScrollView: defaultComponent,
  FlatList: defaultComponent,
  ActivityIndicator: defaultComponent,
  TextInput: defaultComponent,
  Modal: defaultComponent,
  KeyboardAvoidingView: defaultComponent,
  SafeAreaView: defaultComponent,
  StatusBar: { setBarStyle: () => {}, setHidden: () => {} },
  Keyboard: { dismiss: () => {}, addListener: () => ({ remove: () => {} }) },
  findNodeHandle: () => null,
  Alert: { alert: () => {} },
  AppRegistry: { registerComponent: () => {}, runApplication: () => {} },
  LogBox: { ignoreLogs: () => {}, ignoreAllLogs: () => {} },
  I18nManager: { isRTL: false, allowRTL: () => {}, forceRTL: () => {} },
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
  Animated: {
    Value: class { setValue = () => {}; interpolate = () => ({}); },
    timing: () => ({ start: (cb?: any) => cb?.() }),
    spring: () => ({ start: (cb?: any) => cb?.() }),
    View: defaultComponent,
    Text: defaultComponent,
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

mock.module('react-native-svg', () => ({
  default: (props: any) => props.children,
  Svg: (props: any) => props.children,
  Path: () => null,
  Circle: () => null,
  Rect: () => null,
  Line: () => null,
  G: (props: any) => props.children,
}));

mock.module('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: () => 'NativeComponent',
}));

