import { mock } from 'bun:test';

mock.module('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj.ios },
  StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  Dimensions: { get: () => ({ width: 393, height: 852 }) },
  // Add other react-native mock implementations as needed
}));
