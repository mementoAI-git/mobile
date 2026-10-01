import { useFonts } from 'expo-font';
import { PatrickHandSC_400Regular } from '@expo-google-fonts/patrick-hand-sc/400Regular';
import { Handlee_400Regular } from '@expo-google-fonts/handlee/400Regular';
import { CutiveMono_400Regular } from '@expo-google-fonts/cutive-mono/400Regular';

/**
 * Handwriting fonts used only by capsule themes (sage, dusk, noir). They load
 * the first time a capsule screen or sheet opens instead of at app launch.
 * Family names match the ones in src/constants/themes.ts.
 */
export const CAPSULE_THEME_FONTS = {
  PatrickHandSC_400Regular,
  Handlee_400Regular,
  CutiveMono_400Regular,
  'Patrick Hand SC': PatrickHandSC_400Regular,
  Handlee: Handlee_400Regular,
  Cutive: CutiveMono_400Regular,
  'Portrait Script': require('../../assets/fonts/Portrait-script-regular.ttf'),
};

export function useCapsuleThemeFonts(): boolean {
  const [loaded] = useFonts(CAPSULE_THEME_FONTS);
  return loaded;
}
