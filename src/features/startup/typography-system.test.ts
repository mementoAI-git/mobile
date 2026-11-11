import {describe, expect, test} from 'bun:test';
import {TYPE} from '@/constants/typography';
import {FONTS} from '@/constants/tokens';

describe('global typography system', () => {
  test('matches the approved Overview-derived role scale', () => {
    expect(TYPE).toMatchObject({
      displayStat: {fontFamily: FONTS.serif, fontSize: 49, lineHeight: 56},
      sheetTitle: {fontFamily: FONTS.sans, fontWeight: '600', fontSize: 20, lineHeight: 32},
      editorTitle: {fontFamily: FONTS.serif, fontSize: 24, lineHeight: 32},
      displayTitle: {fontFamily: FONTS.serif, fontSize: 37, lineHeight: 43},
      dashboardTitle: {fontFamily: FONTS.sans, fontWeight: '600', fontSize: 24, lineHeight: 30},
      dashboardTitleSmall: {fontFamily: FONTS.bodyBold, fontWeight: '700', fontSize: 16, lineHeight: 22},
      voicePickerTitle: {fontFamily: FONTS.bodyBold, fontWeight: '700', fontSize: 20, lineHeight: 26},
      screenTitle: {fontFamily: FONTS.serif, fontSize: 29, lineHeight: 35},
      greeting: {fontFamily: FONTS.sans, fontWeight: '600', fontSize: 28, lineHeight: 34},
      sectionTitle: {fontFamily: FONTS.serif, fontSize: 23, lineHeight: 29},
      sectionTitleWeak: {fontFamily: FONTS.serifItalic, fontSize: 23, lineHeight: 29},
      cardTitle: {fontFamily: FONTS.serifMedium, fontSize: 21, lineHeight: 27},
      uiTitle: {fontFamily: FONTS.sansSemi, fontSize: 21, lineHeight: 27},
      bodyLarge: {fontFamily: FONTS.sans, fontSize: 16, lineHeight: 25},
      body: {fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24},
      bodyStrong: {fontFamily: FONTS.bodyBold, fontWeight: '700', fontSize: 15, lineHeight: 24},
      bodySmall: {fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20},
      label: {fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 20},
      button: {fontFamily: FONTS.sansSemi, fontSize: 16, lineHeight: 23},
      buttonSmall: {fontFamily: FONTS.sansSemi, fontSize: 14, lineHeight: 20},
      metadata: {fontFamily: FONTS.sansMedium, fontSize: 11, lineHeight: 16},
      eyebrow: {fontFamily: FONTS.sansBold, fontSize: 10, lineHeight: 14},
      input: {fontFamily: FONTS.sans, fontSize: 16, lineHeight: 23},
      stat: {fontFamily: FONTS.sansBold, fontSize: 21, lineHeight: 27},
      mono: {fontFamily: FONTS.mono, fontSize: 14, lineHeight: 20},
    });
  });

  test('exposes only the approved role names', () => {
    expect(Object.keys(TYPE).sort()).toEqual([
      'body', 'bodyLarge', 'bodyLargeSemi', 'bodySmall', 'bodySmallStrong', 'bodyStrong', 'button', 'buttonSmall', 'captureInput', 'cardTitle', 'cardTitleAccent',
      'dashboardTitle', 'dashboardTitleSmall', 'displayStat', 'displayTitle', 'editorTitle', 'eyebrow', 'greeting', 'greetingEditorial', 'greetingEditorialName', 'greetingName', 'input', 'insightStat', 'label',
      'calendarWheel', 'metadata', 'mono', 'musicCaption', 'musicTrack', 'musicVolume',
      'planPrice', 'profileName', 'publishSuccessAction', 'publishSuccessTitle', 'reflectionTitle', 'reflectionTitleAccent', 'screenTitle', 'screenTitleAccent', 'sectionTitle', 'sectionTitleWeak', 'sheetTitle', 'stat', 'streakCount', 'uiTitle', 'voicePickerTitle',
    ].sort());
  });

  test('scales typography responsively using conservative factors', async () => {
    const source = await Bun.file(new URL('../../constants/typography.ts', import.meta.url)).text();
    expect(source).toContain("import { ms } from '@/constants/responsive'");
    expect(source).toContain("fontSize: ms(15, 0.2)");
    expect(source).not.toContain('allowFontScaling={false}');
  });
});
