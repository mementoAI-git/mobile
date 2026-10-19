import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { BRAND_BUTTON_GRADIENT, COLORS } from '@/constants/tokens';
import { getBrandButtonSurface, withBrandButtonSurface, withPressableBrandSurface } from './brand-button-surface';

describe('web brand button surface parity', () => {
  test('copies the actual web gradient including ellipse geometry and opacity', () => {
    const webPath = '../Web/memento-web/src/index.css';
    // Mobile-only checkouts keep checking the copied web contract; a sibling
    // web checkout additionally verifies it directly against the source CSS.
    const copiedWebContract = 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0) 100%)';
    const web = existsSync(webPath)
      ? readFileSync(webPath, 'utf8').match(/--gradient-brand-button-surface:\s*([\s\S]*?);/)?.[1]
      : copiedWebContract;
    expect(web).toBeDefined();
    expect(BRAND_BUTTON_GRADIENT.replace(/\s+/g, '')).toBe(web!.replace(/\s+/g, ''));
  });
  test('adds only the gradient paint property to a brand button', () => {
    expect(getBrandButtonSurface(COLORS.brand)).toEqual({experimental_backgroundImage: BRAND_BUTTON_GRADIENT});
    const style = {width: 140, height: 34, borderRadius: 17, paddingHorizontal: 18, backgroundColor: COLORS.brand, opacity: 0.4};
    expect(withBrandButtonSurface(style)).toEqual([style, {experimental_backgroundImage: BRAND_BUTTON_GRADIENT}]);
    expect(style).not.toHaveProperty('experimental_backgroundImage');
  });
  test('recognizes NativeWind brand controls but excludes tints and other surfaces', () => {
    expect(getBrandButtonSurface(undefined, 'h-14 bg-brand rounded-full')).toBeDefined();
    expect(getBrandButtonSurface(undefined, '!bg-brand')).toBeDefined();
    for (const className of ['bg-brand/20', 'bg-brand-subtle', 'border-brand', 'bg-card', 'bg-fill-weak']) {
      expect(getBrandButtonSurface(undefined, className)).toBeUndefined();
    }
    expect(getBrandButtonSurface(COLORS.card, 'bg-brand')).toBeUndefined();
  });
  test('keeps press-state styles and only highlights their brand-filled state', () => {
    const style = ({pressed}: {pressed: boolean}) => ({height: 44, backgroundColor: pressed ? COLORS.brand : COLORS.card});
    const painted = withPressableBrandSurface(style);
    expect(typeof painted).toBe('function');
    if (typeof painted !== 'function') throw new Error('Missing press-state function');
    expect(painted({pressed: false, hovered: false})).toEqual(style({pressed: false}));
    expect(painted({pressed: true, hovered: false})).toEqual([style({pressed: true}), {experimental_backgroundImage: BRAND_BUTTON_GRADIENT}]);
  });
});
