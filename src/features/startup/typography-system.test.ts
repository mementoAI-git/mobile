import {describe, expect, test} from 'bun:test';
import {TYPE} from '@/constants/typography';
import {FONTS} from '@/constants/tokens';

describe('global typography system', () => {
  test('matches the approved Overview-derived role scale', () => {
    expect(TYPE).toMatchObject({
      displayStat: {fontFamily: FONTS.serif, fontSize: 49, lineHeight: 56},
      displayTitle: {fontFamily: FONTS.serif, fontSize: 37, lineHeight: 43},
      screenTitle: {fontFamily: FONTS.serif, fontSize: 29, lineHeight: 35},
      greeting: {fontFamily: FONTS.sans, fontSize: 25, lineHeight: 33},
      sectionTitle: {fontFamily: FONTS.serif, fontSize: 23, lineHeight: 29},
      cardTitle: {fontFamily: FONTS.serifMedium, fontSize: 21, lineHeight: 27},
      uiTitle: {fontFamily: FONTS.sansSemi, fontSize: 21, lineHeight: 27},
      bodyLarge: {fontFamily: FONTS.sans, fontSize: 16, lineHeight: 25},
      body: {fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24},
      bodyStrong: {fontFamily: FONTS.sansBold, fontSize: 15, lineHeight: 24},
      bodySmall: {fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19},
      label: {fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 20},
      button: {fontFamily: FONTS.sansSemi, fontSize: 16, lineHeight: 23},
      buttonSmall: {fontFamily: FONTS.sansSemi, fontSize: 14, lineHeight: 20},
      metadata: {fontFamily: FONTS.sansMedium, fontSize: 11, lineHeight: 16},
      eyebrow: {fontFamily: FONTS.sansBold, fontSize: 10, lineHeight: 14},
      input: {fontFamily: FONTS.sans, fontSize: 16, lineHeight: 23},
      stat: {fontFamily: FONTS.sansBold, fontSize: 21, lineHeight: 27},
      mono: {fontFamily: FONTS.mono, fontSize: 13, lineHeight: 19},
    });
  });

  test('exposes only the approved role names', () => {
    expect(Object.keys(TYPE).sort()).toEqual([
      'body', 'bodyLarge', 'bodySmall', 'bodyStrong', 'button', 'buttonSmall', 'cardTitle',
      'displayStat', 'displayTitle', 'eyebrow', 'greeting', 'input', 'label',
      'metadata', 'mono', 'screenTitle', 'sectionTitle', 'stat', 'uiTitle',
    ]);
  });

  test('scales typography responsively using conservative factors', async () => {
    const source = await Bun.file(new URL('../../constants/typography.ts', import.meta.url)).text();
    expect(source).toContain("import { ms } from '@/constants/responsive'");
    expect(source).toContain("fontSize: ms(15, 0.2)");
    expect(source).not.toContain('allowFontScaling={false}');
  });
});
