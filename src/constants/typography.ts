import {StyleSheet} from 'react-native';
import {FONTS} from '@/constants/tokens';

export const TYPE_METRICS = Object.freeze({
  displayStat: Object.freeze({fontSize: 48, lineHeight: 54}),
  displayTitle: Object.freeze({fontSize: 36, lineHeight: 42}),
  screenTitle: Object.freeze({fontSize: 28, lineHeight: 34}),
  greeting: Object.freeze({fontSize: 24, lineHeight: 32}),
  sectionTitle: Object.freeze({fontSize: 22, lineHeight: 28}),
  cardTitle: Object.freeze({fontSize: 20, lineHeight: 26}),
  uiTitle: Object.freeze({fontSize: 20, lineHeight: 26}),
  bodyLarge: Object.freeze({fontSize: 16, lineHeight: 24}),
  body: Object.freeze({fontSize: 15, lineHeight: 23}),
  bodyStrong: Object.freeze({fontSize: 15, lineHeight: 23}),
  bodySmall: Object.freeze({fontSize: 13, lineHeight: 19}),
  label: Object.freeze({fontSize: 14, lineHeight: 20}),
  button: Object.freeze({fontSize: 16, lineHeight: 22}),
  buttonSmall: Object.freeze({fontSize: 14, lineHeight: 20}),
  metadata: Object.freeze({fontSize: 11, lineHeight: 16}),
  eyebrow: Object.freeze({fontSize: 10, lineHeight: 14}),
  input: Object.freeze({fontSize: 16, lineHeight: 22}),
  stat: Object.freeze({fontSize: 20, lineHeight: 26}),
  mono: Object.freeze({fontSize: 13, lineHeight: 19}),
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
