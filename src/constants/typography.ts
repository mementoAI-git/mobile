import {Platform, StyleSheet} from 'react-native';
import { ms } from '@/constants/responsive';
import {FONTS} from '@/constants/tokens';

export const TYPE_METRICS = Object.freeze({
  displayStat: Object.freeze({fontSize: ms(48, 0.25), lineHeight: ms(54, 0.25)}),
  displayTitle: Object.freeze({fontSize: ms(36, 0.25), lineHeight: ms(42, 0.25)}),
  screenTitle: Object.freeze({fontSize: ms(28, 0.25), lineHeight: ms(34, 0.25)}),
  // Fixed 28/34 (not device-scaled), per the Overview greeting design.
  greeting: Object.freeze({fontSize: 28, lineHeight: 34}),
  /** Garamond runs small next to SF Pro Rounded, so the name is set larger on the same line height. */
  greetingName: Object.freeze({fontSize: 32, lineHeight: 34}),
  // The editorial greeting (still used on web): one serif line beside the sun/moon.
  greetingEditorial: Object.freeze({fontSize: ms(24, 0.25), lineHeight: ms(32, 0.25)}),
  captureInput: Object.freeze({fontSize: ms(20, 0.25), lineHeight: ms(28, 0.25)}),
  reflectionTitle: Object.freeze({fontSize: ms(20, 0.25), lineHeight: ms(27, 0.25)}),
  sectionTitle: Object.freeze({fontSize: ms(22, 0.25), lineHeight: ms(28, 0.25)}),
  cardTitle: Object.freeze({fontSize: ms(20, 0.25), lineHeight: ms(26, 0.25)}),
  uiTitle: Object.freeze({fontSize: ms(20, 0.25), lineHeight: ms(26, 0.25)}),
  bodyLarge: Object.freeze({fontSize: ms(16, 0.2), lineHeight: ms(24, 0.2)}),
  body: Object.freeze({fontSize: ms(15, 0.2), lineHeight: ms(23, 0.2)}),
  bodyStrong: Object.freeze({fontSize: ms(15, 0.2), lineHeight: ms(23, 0.2)}),
  bodySmall: Object.freeze({fontSize: ms(14, 0.2), lineHeight: ms(20, 0.2)}),
  label: Object.freeze({fontSize: ms(14, 0.2), lineHeight: ms(20, 0.2)}),
  button: Object.freeze({fontSize: ms(16, 0.2), lineHeight: ms(22, 0.2)}),
  buttonSmall: Object.freeze({fontSize: ms(14, 0.2), lineHeight: ms(20, 0.2)}),
  metadata: Object.freeze({fontSize: ms(11, 0.2), lineHeight: ms(16, 0.2)}),
  eyebrow: Object.freeze({fontSize: ms(10, 0.2), lineHeight: ms(14, 0.2)}),
  input: Object.freeze({fontSize: ms(16, 0.2), lineHeight: ms(22, 0.2)}),
  stat: Object.freeze({fontSize: ms(20, 0.25), lineHeight: ms(26, 0.25)}),
  mono: Object.freeze({fontSize: ms(14, 0.2), lineHeight: ms(20, 0.2)}),
});

export const TYPE = StyleSheet.create({
  displayStat: {fontFamily: FONTS.serif, ...TYPE_METRICS.displayStat},
  displayTitle: {fontFamily: FONTS.serif, ...TYPE_METRICS.displayTitle},
  sheetTitle: {fontFamily: Platform.select({ios: FONTS.sans, default: FONTS.sansSemi}), fontWeight: '600', fontSize: 20, lineHeight: 32},
  editorTitle: {fontFamily: FONTS.serif, fontSize: 24, lineHeight: 32},
  screenTitle: {fontFamily: FONTS.serif, ...TYPE_METRICS.screenTitle},
  /** The italic word in a screen title ("My *insights*"): the loaded serif italic face. */
  screenTitleAccent: {fontFamily: FONTS.serifItalic, ...TYPE_METRICS.screenTitle},
  dashboardTitle: {fontFamily: Platform.select({ios: FONTS.sans, default: FONTS.sansSemi}), fontWeight: '600', fontSize: 24, lineHeight: 30},
  dashboardTitleSmall: {fontFamily: FONTS.bodyBold, fontWeight: '700', fontSize: 16, lineHeight: 22},
  publishSuccessTitle: {fontFamily: FONTS.sans, fontWeight: '600', fontSize: ms(24, 0.25), lineHeight: ms(32, 0.25)},
  musicCaption: {fontFamily: FONTS.sansMedium, fontSize: 12, lineHeight: 16},
  musicTrack: {fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 20},
  musicVolume: {fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20},
  calendarWheel: {fontSize: 23, fontWeight: '400'},
  publishSuccessAction: {fontFamily: FONTS.sans, fontWeight: '600', ...TYPE_METRICS.bodyLarge},
  voicePickerTitle: {fontFamily: FONTS.bodyBold, fontWeight: '700', fontSize: 20, lineHeight: 26},
  /** Settings profile card name; web settings-profile-header text-xl bold. */
  profileName: {fontFamily: FONTS.bodyBold, fontWeight: '700', ...TYPE_METRICS.uiTitle},
  /** Overview capture card writing area; web overview-capture-card Garamond 24/34. */
  captureInput: {fontFamily: FONTS.serif, ...TYPE_METRICS.captureInput},
  /** Continue reflecting card prompt; web daily-prompt-section Garamond 24/31. */
  reflectionTitle: {fontFamily: FONTS.serif, ...TYPE_METRICS.reflectionTitle},
  /** Orange highlighted words in a reflection prompt: the loaded serif italic face, never synthetic italics. */
  reflectionTitleAccent: {fontFamily: FONTS.serifItalic, ...TYPE_METRICS.reflectionTitle},
  /** Overview greeting: SF Pro Rounded semibold on iOS, two lines (greeting + prompt). */
  greeting: {fontFamily: Platform.select({ios: FONTS.sans, default: FONTS.sansSemi}), fontWeight: '600', ...TYPE_METRICS.greeting},
  /** The person's name inside the greeting: muted serif medium italic accent. */
  greetingName: {fontFamily: FONTS.serifMediumItalic, ...TYPE_METRICS.greetingName},
  /** Editorial greeting variant (web's welcome section): EB Garamond 24/32, name in serif italic. */
  greetingEditorial: {fontFamily: FONTS.serif, ...TYPE_METRICS.greetingEditorial},
  greetingEditorialName: {fontFamily: FONTS.serifItalic, ...TYPE_METRICS.greetingEditorial},
  sectionTitle: {fontFamily: FONTS.serif, ...TYPE_METRICS.sectionTitle},
  sectionTitleWeak: {fontFamily: FONTS.serifItalic, ...TYPE_METRICS.sectionTitle},
  cardTitle: {fontFamily: FONTS.serifMedium, ...TYPE_METRICS.cardTitle},
  /** The muted italic word in a sub-page title ("People & *groups*"), as web PageHeading `em`. */
  cardTitleAccent: {fontFamily: FONTS.serifItalic, ...TYPE_METRICS.cardTitle},
  uiTitle: {fontFamily: FONTS.sansSemi, ...TYPE_METRICS.uiTitle},
  /** Streak card day count; web streak card B 28/36 semibold. */
  streakCount: {fontFamily: FONTS.sansSemi, fontSize: ms(28, 0.25), lineHeight: ms(36, 0.25)},
  /** Plan price on the plans page; web pricing text-4xl semibold. */
  planPrice: {fontFamily: FONTS.sansSemi, fontSize: ms(36, 0.25), lineHeight: ms(40, 0.25)},
  /** Bold figures inside small copy ("3 reflections"). */
  bodySmallStrong: {fontFamily: FONTS.sansSemi, ...TYPE_METRICS.bodySmall},
  bodyLarge: {fontFamily: FONTS.sans, ...TYPE_METRICS.bodyLarge},
  /** 16px semibold in the body face (SF Pro Rounded on iOS): the Account enrichment strength word. */
  bodyLargeSemi: {fontFamily: Platform.select({ios: FONTS.sans, default: FONTS.sansSemi}), fontWeight: '600', ...TYPE_METRICS.bodyLarge},
  body: {fontFamily: FONTS.sans, ...TYPE_METRICS.body},
  bodyStrong: {fontFamily: FONTS.bodyBold, fontWeight: '700', ...TYPE_METRICS.bodyStrong},
  bodySmall: {fontFamily: FONTS.sans, ...TYPE_METRICS.bodySmall},
  label: {fontFamily: FONTS.sansMedium, ...TYPE_METRICS.label},
  button: {fontFamily: FONTS.sansSemi, ...TYPE_METRICS.button},
  buttonSmall: {fontFamily: FONTS.sansSemi, ...TYPE_METRICS.buttonSmall},
  metadata: {fontFamily: FONTS.sansMedium, ...TYPE_METRICS.metadata},
  eyebrow: {fontFamily: FONTS.sansBold, ...TYPE_METRICS.eyebrow},
  input: {fontFamily: FONTS.sans, ...TYPE_METRICS.input},
  stat: {fontFamily: FONTS.sansBold, ...TYPE_METRICS.stat},
  /** Insights statistics figures: SF Pro Rounded semibold on iOS, like the labels under them. */
  insightStat: {fontFamily: Platform.select({ios: FONTS.sans, default: FONTS.sansSemi}), fontWeight: '600', ...TYPE_METRICS.stat},
  mono: {fontFamily: FONTS.mono, ...TYPE_METRICS.mono},
});

export type TypographyRole = keyof typeof TYPE;

/** Draft artwork uses its bundled face once loaded, with the system face as fallback. */
export function getDraftTypography(fontFamily: string) {
  return {
    action: {...TYPE.buttonSmall, fontFamily, fontWeight: '700' as const},
    emptyTitle: {...TYPE.button, fontFamily},
    emptyDescription: {...TYPE.label, fontFamily},
    date: {...TYPE.metadata, fontFamily, fontSize: 12, lineHeight: 16},
  };
}
