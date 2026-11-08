import { resolveThemedStyles } from '@/features/appearance/themed-styles';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAppearanceStore } from '@/store/appearance.store';
import { resolveAppearance } from '@/features/appearance/appearance';
import { COLORS } from '@/constants/tokens';
import { DARK_COLORS, DEEP_SKY_COLORS, LIGHT_SKY_COLORS } from '@/constants/appearance';

export function useResolvedAppearance() {
  const preference = useAppearanceStore((s) => s.preference);
  const system = useColorScheme();
  return resolveAppearance(preference, system);
}

export function useThemeColors() {
  const preference = useAppearanceStore((s) => s.preference);
  const scheme = useResolvedAppearance();
  if (preference === 'deep-sky') return DEEP_SKY_COLORS;
  if (preference === 'light-sky') return LIGHT_SKY_COLORS;
  return scheme === 'dark' ? DARK_COLORS : COLORS;
}

/** Re-resolve existing StyleSheet semantic colors without mutating shared styles. */
export function useThemedStyles<T>(styles: T): T {
  const colors = useThemeColors();
  return useMemo(() => colors === COLORS ? styles : resolveThemedStyles(styles, colors), [styles, colors]);
}

/** Explicit token factories preserve the difference between ink, surfaces and media. */
export function useThemeStyles<T>(createStyles: (colors: typeof COLORS) => T): T {
  const colors = useThemeColors();
  return useMemo(() => createStyles(colors), [createStyles, colors]);
}
