import React, { type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ToastViewport } from '@/components/ui/Toast';
import { SheetManager } from '@/components/sheets/SheetManager';
import { DEEP_SKY } from '@/constants/appearance';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAppearanceStore } from '@/store/appearance.store';
import { DeepSkyBackdrop } from './DeepSkyBackdrop';

/**
 * Re-measures insets inside a native modal's own view-controller window, and
 * paints the app background there: a native modal can't see the root's sky,
 * so Deep Sky's transparent pages would otherwise show black.
 */
export function NativeModalSafeAreaBoundary({ children }: PropsWithChildren) {
  const colors = useThemeColors();
  const deepSky = useAppearanceStore((s) => s.preference === 'deep-sky');
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: deepSky ? DEEP_SKY.canvas : colors.background }}>
        {deepSky && <DeepSkyBackdrop />}
        <BottomSheetModalProvider>
          {children}
          <SheetManager isModal />
        </BottomSheetModalProvider>
      </View>
      <ToastViewport />
    </SafeAreaProvider>
  );
}
