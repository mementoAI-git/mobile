import React, { type PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/** Re-measures insets inside a native modal's own view-controller window. */
export function NativeModalSafeAreaBoundary({ children }: PropsWithChildren) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
