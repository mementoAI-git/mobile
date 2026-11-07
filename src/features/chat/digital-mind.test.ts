import { describe, expect, test } from 'bun:test';
import { avatarBadgeOffset, DEFAULT_DIGITAL_MIND, DIGITAL_MIND_COLOURS, DIGITAL_MIND_SHAPES, normalizeDigitalMind } from './digital-mind';

describe('digital mind identity', () => {
  test('defaults to the user avatar and the requested name', () => {
    expect(normalizeDigitalMind(undefined)).toEqual(DEFAULT_DIGITAL_MIND);
    expect(DEFAULT_DIGITAL_MIND).toEqual({ name: 'My Digital mind', style: 'identicon', colour: 'orange' });
  });
  test('offers four geometric styles and five colour presets', () => {
    expect(DIGITAL_MIND_SHAPES).toEqual(['star', 'square', 'triangle', 'diamond']);
    expect(DIGITAL_MIND_COLOURS.map(colour => colour.id)).toEqual(['orange', 'blue', 'green', 'yellow', 'pink']);
    for (const style of DIGITAL_MIND_SHAPES) for (const colour of DIGITAL_MIND_COLOURS) {
      expect(normalizeDigitalMind({ name: 'My mind', style, colour: colour.id })).toEqual({ name: 'My mind', style, colour: colour.id });
    }
  });
  test('trims names, limits length, and rejects corrupted stored choices', () => {
    expect(normalizeDigitalMind({ name: '  Aurora\n  ', style: 'triangle', colour: 'pink' }).name).toBe('Aurora');
    expect(normalizeDigitalMind({ name: ' '.repeat(5) }).name).toBe('My Digital mind');
    expect(normalizeDigitalMind({ name: 'x'.repeat(100) }).name).toHaveLength(32);
    expect(normalizeDigitalMind({ style: 'missing', colour: 'missing' } as never)).toEqual(DEFAULT_DIGITAL_MIND);
  });
  test('migrates saved circle and purple choices to star and yellow', () => {
    expect(normalizeDigitalMind({ style: 'circle', colour: 'purple' })).toMatchObject({ style: 'star', colour: 'yellow' });
    expect(normalizeDigitalMind({ style: 'profile' }).style).toBe('identicon');
  });
  test('centres the logo badge on the avatar circumference', () => {
    const offset = avatarBadgeOffset(44, 20);
    const centreDelta = 44 / 2 - offset - 20 / 2;
    expect(Math.hypot(centreDelta, centreDelta)).toBeCloseTo(22);
  });
  test('voice bubbles retain timestamps without the redundant spoken indicator', async () => {
    const bubble = await Bun.file(new URL('../../components/chat/MessageBubble.tsx', import.meta.url)).text();
    expect(bubble).not.toContain('Spoken');
    expect(bubble).not.toContain('voiceIndicator');
    expect(bubble).toContain('{responseTime &&');
  });
});

describe('friendly avatar geometry and chat surfaces', () => {
  test('uses a rounded eight-ended starburst and finite closed paths', async () => {
    const { AVATAR_CORNER_RADIUS, avatarShapePoints, roundedAvatarPath } = await import('./friendly-avatar-shapes');
    expect(AVATAR_CORNER_RADIUS).toBe(14);
    expect(avatarShapePoints('star')).toHaveLength(16);
    for (const shape of DIGITAL_MIND_SHAPES) {
      const path = roundedAvatarPath(shape);
      expect(path).toEndWith(' Z');
      expect(path).toContain(' A ');
      expect(path).not.toMatch(/NaN|Infinity/);
    }
    expect(roundedAvatarPath('square')).toContain('A 14 14');
  });
  test('keeps AI bubbles and Save on theme-adaptive neutral tokens', async () => {
    const [bubble, sheet] = await Promise.all([
      Bun.file(new URL('../../components/chat/MessageBubble.tsx', import.meta.url)).text(),
      Bun.file(new URL('../../components/sheets/DigitalMindSheet.tsx', import.meta.url)).text(),
    ]);
    expect(bubble).toContain('useThemeStyles(createStyles)');
    expect(bubble).toContain('assistantSurface: { backgroundColor: COLORS.fillWeak, borderRadius: 14, padding: 10 }');
    expect(sheet).toContain("['identicon', ...DIGITAL_MIND_SHAPES]");
    expect(sheet).toContain('height: 48, minHeight: 48, borderRadius: 100');
    expect(sheet).toContain('backgroundColor: colors.activeFill');
    expect(sheet).toContain('color: colors.activeText');
  });
});
