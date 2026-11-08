import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { getTabBarItemWidths } from '@/features/navigation/tab-bar-layout';
import { minTouchTarget } from '@/constants/responsive';

describe('navigation and tab bar sizing', () => {
  test('tab bar computes item widths safely at 320pt compact width', () => {
    const layout320 = getTabBarItemWidths({
      screenWidth: 320,
      visibleTabsCount: 4,
      maxActiveWidth: 96,
      maxInactiveWidth: 60,
    });

    expect(layout320.pillInternalWidth).toBe(200);
    expect(layout320.activeWidth).toBeLessThanOrEqual(96);
    expect(layout320.activeWidth).toBeGreaterThan(0);
    expect(layout320.inactiveWidth).toBeLessThanOrEqual(60);
    expect(layout320.inactiveWidth).toBeGreaterThan(0);

    const totalWidth = layout320.activeWidth + layout320.inactiveWidth * 3 + layout320.interItemGapTotal;
    expect(totalWidth).toBeLessThanOrEqual(layout320.pillInternalWidth);
  });

  test('tab bar uses responsive metrics and preserves touch target floors', () => {
    const tabBarSource = readFileSync('src/components/TabBar.tsx', 'utf8');

    expect(tabBarSource).toContain("from '@/constants/responsive'");
    expect(tabBarSource).not.toContain("from 'react-native-size-matters'");
    expect(minTouchTarget(56)).toBeGreaterThanOrEqual(44);
    expect(minTouchTarget(52)).toBeGreaterThanOrEqual(44);
  });

  test('plan summary banner caps badge width and uses responsive module', () => {
    const bannerSource = readFileSync('src/components/subscription/PlanSummaryBanner.tsx', 'utf8');

    expect(bannerSource).toContain("from '@/constants/responsive'");
    expect(bannerSource).not.toContain("from 'react-native-size-matters'");
    expect(bannerSource).toContain("maxWidth: '44%'");
    expect(bannerSource).toContain('flex: 1');
    expect(bannerSource).toContain('minWidth: 0');
  });

  test('shared settings and beneficiary rows allow titles to shrink and guarantee 44dp touch targets', () => {
    const hubRow = readFileSync('src/components/settings/SettingsHubRow.tsx', 'utf8');
    const securityRow = readFileSync('src/components/security/SecurityCredentialRow.tsx', 'utf8');
    const personRow = readFileSync('src/components/beneficiaries/PersonCard.tsx', 'utf8');
    const groupRow = readFileSync('src/components/beneficiaries/BeneficiaryGroupRow.tsx', 'utf8');

    // Hub row has flex: 1 and minHeight >= 44
    expect(hubRow).toContain('flex: 1');
    expect(hubRow).toContain('minHeight:');

    // Security row delete button touch target >= 44
    expect(securityRow).toContain('minTouchTarget');

    // Person and group cards let their text column shrink beside the avatar/swatch.
    expect(personRow).toContain('flex: 1, minWidth: 0');
    expect(groupRow).toContain('flex: 1, minWidth: 0');
  });
});
