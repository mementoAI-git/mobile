import {StyleSheet} from 'react-native';
import {FONTS} from '@/constants/tokens';

export const TYPE = StyleSheet.create({
  displayStat: {fontFamily: FONTS.serif, fontSize: 48, lineHeight: 54},
  displayTitle: {fontFamily: FONTS.serif, fontSize: 36, lineHeight: 42},
  screenTitle: {fontFamily: FONTS.serif, fontSize: 28, lineHeight: 34},
  greeting: {fontFamily: FONTS.sans, fontSize: 24, lineHeight: 32},
  sectionTitle: {fontFamily: FONTS.serif, fontSize: 22, lineHeight: 28},
  cardTitle: {fontFamily: FONTS.serifMedium, fontSize: 20, lineHeight: 26},
  uiTitle: {fontFamily: FONTS.sansSemi, fontSize: 20, lineHeight: 26},
  bodyLarge: {fontFamily: FONTS.sans, fontSize: 16, lineHeight: 24},
  body: {fontFamily: FONTS.sans, fontSize: 15, lineHeight: 23},
  bodySmall: {fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19},
  label: {fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 20},
  button: {fontFamily: FONTS.sansSemi, fontSize: 16, lineHeight: 22},
  buttonSmall: {fontFamily: FONTS.sansSemi, fontSize: 14, lineHeight: 20},
  metadata: {fontFamily: FONTS.sansMedium, fontSize: 11, lineHeight: 16},
  eyebrow: {fontFamily: FONTS.sansBold, fontSize: 10, lineHeight: 14},
  input: {fontFamily: FONTS.sans, fontSize: 16, lineHeight: 22},
  stat: {fontFamily: FONTS.sansBold, fontSize: 20, lineHeight: 26},
  mono: {fontFamily: FONTS.mono, fontSize: 13, lineHeight: 19},
});

export type TypographyRole = keyof typeof TYPE;
