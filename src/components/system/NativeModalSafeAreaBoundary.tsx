import React, { type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ToastViewport } from '@/components/ui/Toast';
import { SheetManager } from '@/components/sheets/SheetManager';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAppearanceStore } from '@/store/appearance.store';
import { DeepSkyBackdrop } from './DeepSkyBackdrop';
import { skyAppearance } from '@/features/appearance/appearance';

/**
 * Re-measures insets inside a native modal's own view-controller window, and
 * paints the app background there: a native modal can't see the root's sky,
 * so the sky themes' transparent pages would otherwise show black.
 */
export function NativeModalSafeAreaBoundary({ children }: PropsWithChildren) {
  const colors = useThemeColors();
  const sky = useAppearanceStore((s) => skyAppearance(s.preference));
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        {sky && <DeepSkyBackdrop sky={sky} />}
        <BottomSheetModalProvider>
          {children}
          <SheetManager isModal />
        </BottomSheetModalProvider>
      </View>
      <ToastViewport />
    </SafeAreaProvider>
  );
}
