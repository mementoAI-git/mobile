import { describe, expect, test } from 'bun:test';
import { getTabBarItemWidths } from './tab-bar-layout';

describe('tab bar responsive width budget', () => {
  test('keeps four tab items and their gaps inside a 393-point pill', () => {
    const layout = getTabBarItemWidths({
      screenWidth: 393,
      visibleTabsCount: 4,
      maxActiveWidth: 96,
      maxInactiveWidth: 60,
    });

    expect(layout.pillInternalWidth).toBe(273);
    expect(layout.activeWidth).toBeCloseTo(87.36, 2);
    expect(layout.inactiveWidth).toBeCloseTo(57.88, 2);
    expect(
      layout.activeWidth
        + layout.inactiveWidth * 3
        + layout.interItemGapTotal,
    ).toBeLessThanOrEqual(273);
  });

  test('never produces negative widths on a very narrow viewport', () => {
    const layout = getTabBarItemWidths({
      screenWidth: 120,
      visibleTabsCount: 4,
      maxActiveWidth: 96,
      maxInactiveWidth: 60,
    });

    expect(layout.activeWidth).toBeGreaterThanOrEqual(0);
    expect(layout.inactiveWidth).toBeGreaterThanOrEqual(0);
  });
});
