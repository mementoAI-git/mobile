import {StyleSheet} from 'react-native';
import { ms } from '@/constants/responsive';
import {FONTS} from '@/constants/tokens';

export const TYPE_METRICS = Object.freeze({
  displayStat: Object.freeze({fontSize: ms(48, 0.25), lineHeight: ms(54, 0.25)}),
  displayTitle: Object.freeze({fontSize: ms(36, 0.25), lineHeight: ms(42, 0.25)}),
  screenTitle: Object.freeze({fontSize: ms(28, 0.25), lineHeight: ms(34, 0.25)}),
  greeting: Object.freeze({fontSize: ms(24, 0.25), lineHeight: ms(32, 0.25)}),
  sectionTitle: Object.freeze({fontSize: ms(22, 0.25), lineHeight: ms(28, 0.25)}),
  cardTitle: Object.freeze({fontSize: ms(20, 0.25), lineHeight: ms(26, 0.25)}),
  uiTitle: Object.freeze({fontSize: ms(20, 0.25), lineHeight: ms(26, 0.25)}),
  bodyLarge: Object.freeze({fontSize: ms(16, 0.2), lineHeight: ms(24, 0.2)}),
  body: Object.freeze({fontSize: ms(15, 0.2), lineHeight: ms(23, 0.2)}),
  bodyStrong: Object.freeze({fontSize: ms(15, 0.2), lineHeight: ms(23, 0.2)}),
  bodySmall: Object.freeze({fontSize: ms(13, 0.2), lineHeight: ms(19, 0.2)}),
  label: Object.freeze({fontSize: ms(14, 0.2), lineHeight: ms(20, 0.2)}),
  button: Object.freeze({fontSize: ms(16, 0.2), lineHeight: ms(22, 0.2)}),
  buttonSmall: Object.freeze({fontSize: ms(14, 0.2), lineHeight: ms(20, 0.2)}),
  metadata: Object.freeze({fontSize: ms(11, 0.2), lineHeight: ms(16, 0.2)}),
  eyebrow: Object.freeze({fontSize: ms(10, 0.2), lineHeight: ms(14, 0.2)}),
  input: Object.freeze({fontSize: ms(16, 0.2), lineHeight: ms(22, 0.2)}),
  stat: Object.freeze({fontSize: ms(20, 0.25), lineHeight: ms(26, 0.25)}),
  mono: Object.freeze({fontSize: ms(13, 0.2), lineHeight: ms(19, 0.2)}),
});

export const TYPE = StyleSheet.create({
  displayStat: {fontFamily: FONTS.serif, ...TYPE_METRICS.displayStat},
  displayTitle: {fontFamily: FONTS.serif, ...TYPE_METRICS.displayTitle},
  screenTitle: {fontFamily: FONTS.serif, ...TYPE_METRICS.screenTitle},
  greeting: {fontFamily: FONTS.sans, ...TYPE_METRICS.greeting},
  sectionTitle: {fontFamily: FONTS.serif, ...TYPE_METRICS.sectionTitle},
  cardTitle: {fontFamily: FONTS.serifMedium, ...TYPE_METRICS.cardTitle},
  uiTitle: {fontFamily: FONTS.sansSemi, ...TYPE_METRICS.uiTitle},
  bodyLarge: {fontFamily: FONTS.sans, ...TYPE_METRICS.bodyLarge},
  body: {fontFamily: FONTS.sans, ...TYPE_METRICS.body},
  bodyStrong: {fontFamily: FONTS.sansBold, ...TYPE_METRICS.bodyStrong},
  bodySmall: {fontFamily: FONTS.sans, ...TYPE_METRICS.bodySmall},
  label: {fontFamily: FONTS.sansMedium, ...TYPE_METRICS.label},
  button: {fontFamily: FONTS.sansSemi, ...TYPE_METRICS.button},
  buttonSmall: {fontFamily: FONTS.sansSemi, ...TYPE_METRICS.buttonSmall},
  metadata: {fontFamily: FONTS.sansMedium, ...TYPE_METRICS.metadata},
  eyebrow: {fontFamily: FONTS.sansBold, ...TYPE_METRICS.eyebrow},
  input: {fontFamily: FONTS.sans, ...TYPE_METRICS.input},
  stat: {fontFamily: FONTS.sansBold, ...TYPE_METRICS.stat},
  mono: {fontFamily: FONTS.mono, ...TYPE_METRICS.mono},
});

export type TypographyRole = keyof typeof TYPE;
