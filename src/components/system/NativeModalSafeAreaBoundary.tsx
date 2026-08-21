import React, { type PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SheetManager } from '@/components/sheets/SheetManager';

/** Re-measures insets inside a native modal's own view-controller window. */
export function NativeModalSafeAreaBoundary({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <BottomSheetModalProvider>
        {children}
        <SheetManager isModal />
      </BottomSheetModalProvider>
    </SafeAreaProvider>
  );
}
