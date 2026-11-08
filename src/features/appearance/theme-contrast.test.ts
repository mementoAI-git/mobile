import { describe, expect, test } from 'bun:test';
import { COLORS, CARD_PASTEL_SURFACES } from '@/constants/tokens';
import { DARK_COLORS, DARK_CARD_SURFACES, APPEARANCE_VARIABLES, DEEP_SKY, DEEP_SKY_COLORS, LIGHT_SKY, LIGHT_SKY_COLORS } from '@/constants/appearance';

function rgb(value: string): number[] {
  if (value.startsWith('#')) return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  return value.match(/[\d.]+/g)!.map(Number);
}
function composite(foreground: string, background: string): number[] {
  const fg = rgb(foreground), bg = rgb(background), alpha = fg[3] ?? 1;
  return fg.slice(0, 3).map((channel, i) => channel * alpha + bg[i] * (1 - alpha));
}
function luminance(channels: number[]): number {
  const linear = channels.map((c) => c / 255).map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrast(foreground: string, background: string): number {
  const a = luminance(composite(foreground, background)), b = luminance(rgb(background));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('theme readability', () => {
  for (const [name, palette, cards] of [
    ['light', COLORS, CARD_PASTEL_SURFACES],
    ['dark', DARK_COLORS, DARK_CARD_SURFACES],
  ] as const) {
    test(`${name}: body, preview, active tabs and media keep readable contrast`, () => {
      for (const surface of [palette.background, palette.cardRaised, ...cards.map((c) => c.bg)]) {
        expect(contrast(palette.textStrong, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.textBase, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.previewText, surface)).toBeGreaterThanOrEqual(4.5);
      }
      // Active fill is translucent in light mode: composite against the page first.
      const activeBg = '#' + composite(palette.activeFill, palette.background).map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
      expect(contrast(palette.activeText, activeBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.mediaText, palette.mediaSurface)).toBeGreaterThanOrEqual(4.5);
    });
  }
  test('mirrors web dark semantic foundations and exposes both status text and fill variables', () => {
    expect(DARK_COLORS.background).toBe('#12131a');
    expect(DARK_COLORS.textStrong).toBe('#FFFFFF');
    expect(DARK_COLORS.textBase).toBe('rgba(255,255,255,0.78)');
    expect(DARK_COLORS.fillWeak).toBe('rgba(255,255,255,0.06)');
    expect(APPEARANCE_VARIABLES['--semantic-success']).toBe('success');
    expect(APPEARANCE_VARIABLES['--semantic-success-fill']).toBe('successFill');
    expect(DARK_COLORS.mediaSurface).toBe(COLORS.mediaSurface);
    expect(DARK_CARD_SURFACES.length).toBe(CARD_PASTEL_SURFACES.length);
  });
});

 test('Deep Sky ink stays readable across every sky stop and card surface', () => {
  for (const surface of Object.values(DEEP_SKY)) {
    expect(contrast(DEEP_SKY_COLORS.textStrong, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(DEEP_SKY_COLORS.textBase, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(DEEP_SKY_COLORS.previewText, surface)).toBeGreaterThanOrEqual(4.5);
  }
});

test('Light Sky ink stays readable on every sky stop and on its translucent cards', () => {
  const sky = [LIGHT_SKY.canvas, LIGHT_SKY.midpoint, LIGHT_SKY.horizon];
  const hex = (channels: number[]) => '#' + channels.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
  for (const stop of sky) {
    const card = hex(composite(LIGHT_SKY_COLORS.card, stop));
    for (const surface of [stop, card]) {
      expect(contrast(LIGHT_SKY_COLORS.textStrong, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(LIGHT_SKY_COLORS.textBase, surface)).toBeGreaterThanOrEqual(4.5);
    }
    // Story previews sit on cards, never on the bare sky.
    expect(contrast(LIGHT_SKY_COLORS.previewText, card)).toBeGreaterThanOrEqual(4.5);
  }
  const activeBg = LIGHT_SKY_COLORS.activeFill;
  expect(contrast(LIGHT_SKY_COLORS.activeText, activeBg)).toBeGreaterThanOrEqual(4.5);
});
