import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetBackdrop } from '@/components/sheets/SheetBackdrop';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { SHEET_HEADER_HANDLE_STYLE } from '@/features/layout/sheet-safe-area';
import {
  SHEET_GRABBER,
  SHEET_RADIUS,
  clampSheetSnapPoints,
  sheetMinHeight,
  sheetTopInset,
} from '@/features/layout/sheet-presentation';

/**
 * Shared look for every bottom sheet, matching web's phone sheets. Spread
 * `chrome.props` onto a `BottomSheetModal`; regular sheets also get
 * `chrome.snapPoints(...)` or `chrome.minContentHeight`. Pass `compact` for
 * short confirmations, which skip the minimum height like web alert dialogs.
 */
export function useSheetChrome({ compact = false }: { compact?: boolean } = {}) {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const topInset = sheetTopInset(height, insets.top);

  return useMemo(() => {
    const minHeight = compact ? 0 : sheetMinHeight(height);
    return {
      props: {
        topInset,
        backdropComponent: SheetBackdrop,
        handleStyle: SHEET_HEADER_HANDLE_STYLE,
        handleIndicatorStyle: {
          backgroundColor: COLORS.strokeStrong,
          width: SHEET_GRABBER.width,
          height: SHEET_GRABBER.height,
          borderRadius: SHEET_GRABBER.borderRadius,
          opacity: SHEET_GRABBER.opacity,
        },
        backgroundStyle: {
          backgroundColor: COLORS.sheet,
          borderTopLeftRadius: SHEET_RADIUS,
          borderTopRightRadius: SHEET_RADIUS,
        },
      },
      /** Minimum height for dynamically sized content, less the grabber row. */
      minContentHeight: minHeight ? Math.max(0, minHeight - SHEET_HEADER_HANDLE_STYLE.height) : 0,
      snapPoints: (points: readonly (string | number)[]) =>
        compact ? [...points] : clampSheetSnapPoints(points, height, topInset),
    };
  }, [COLORS.sheet, COLORS.strokeStrong, compact, height, topInset]);
}
