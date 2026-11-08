import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';

describe('shared plan summary banner', () => {
  test('uses one visual component on Billing and Settings, and Account leaves it out', () => {
    const account = readFileSync('app/account.tsx', 'utf8');
    const billing = readFileSync('app/settings/billing.tsx', 'utf8');
    const settings = readFileSync('app/settings/index.tsx', 'utf8');

    expect(billing).toContain("from '@/components/subscription/PlanSummaryBanner'");
    expect(settings).toContain("from '@/components/subscription/PlanSummaryBanner'");
    expect(account).not.toContain('PlanSummaryBanner');
    expect(billing).toContain('<PlanSummaryBanner');
    expect(settings).toContain('<PlanSummaryBanner');
    expect(existsSync('src/components/billing/BillingPlanBanner.tsx')).toBe(false);
  });

  test('keeps plan badges compact and constrained by their card width', () => {
    const banner = readFileSync('src/components/subscription/PlanSummaryBanner.tsx', 'utf8');

    expect(banner).toContain('styles.topRow');
    expect(banner).toContain('styles.title');
    expect(banner).toContain('styles.badge');
    expect(banner).toContain('styles.badgeText');
    expect(banner).toContain('maxWidth: \'44%\'');
    expect(banner).toContain("from '@/constants/responsive'");
    expect(banner).not.toContain("from 'react-native-size-matters'");
    expect(banner).not.toContain('useWindowDimensions');
  });
});
