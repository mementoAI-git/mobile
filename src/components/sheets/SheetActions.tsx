import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A bottom sheet's action group (its CTA buttons). It sits at the bottom of the
 * sheet, 8px above the home indicator, however short the content above it is:
 * the sheet root (or scroll content) grows to the sheet's height with
 * `SHEET_FILL`, and the auto top margin pushes these actions down.
 */
export function SheetActions({ children, style, className }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}) {
  return <View className={className} style={[{ marginTop: 'auto' }, style]}>{children}</View>;
}

/** Spread onto a sheet's root (or scroll content) style so it fills the sheet. */
export const SHEET_FILL = { flexGrow: 1 } as const;
