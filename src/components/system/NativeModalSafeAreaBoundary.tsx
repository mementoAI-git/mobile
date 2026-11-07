import React, { type PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ToastViewport } from '@/components/ui/Toast';
import { SheetManager } from '@/components/sheets/SheetManager';

/** Re-measures insets inside a native modal's own view-controller window. */
export function NativeModalSafeAreaBoundary({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <BottomSheetModalProvider>
        {children}
        <SheetManager isModal />
      </BottomSheetModalProvider>
      <ToastViewport />
    </SafeAreaProvider>
  );
}
