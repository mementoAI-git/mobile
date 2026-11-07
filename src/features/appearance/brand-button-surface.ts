import { StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { BRAND_BUTTON_GRADIENT, COLORS } from '@/constants/tokens';

const surface: ViewStyle = { experimental_backgroundImage: BRAND_BUTTON_GRADIENT };

/** Only solid brand-filled controls receive the web highlight. */
export function getBrandButtonSurface(backgroundColor: ViewStyle['backgroundColor'], className?: string): ViewStyle | undefined {
  const brand = backgroundColor === undefined
    ? className?.split(/\s+/).some((token) => token.replace(/!/g, '') === 'bg-brand')
    : backgroundColor === COLORS.brand;
  return brand ? surface : undefined;
}

/** Append a paint property without touching the original style or layout. */
export function withBrandButtonSurface(style: StyleProp<ViewStyle>, className?: string): StyleProp<ViewStyle> {
  const gradient = getBrandButtonSurface(StyleSheet.flatten(style)?.backgroundColor, className);
  return gradient ? [style, gradient] : style;
}

export function withPressableBrandSurface(style: PressableProps['style'], className?: string): PressableProps['style'] {
  return typeof style === 'function'
    ? (state) => withBrandButtonSurface(style(state), className)
    : withBrandButtonSurface(style, className);
}
