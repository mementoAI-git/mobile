import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';

describe('shared plan summary banner', () => {
  test('uses one visual component on Account, Billing, and Settings', () => {
    const account = readFileSync('app/account.tsx', 'utf8');
    const billing = readFileSync('app/settings/billing.tsx', 'utf8');
    const settings = readFileSync('app/settings/index.tsx', 'utf8');

    expect(account).toContain("from '@/components/subscription/PlanSummaryBanner'");
    expect(billing).toContain("from '@/components/subscription/PlanSummaryBanner'");
    expect(settings).toContain("from '@/components/subscription/PlanSummaryBanner'");
    expect(account).toContain('<PlanSummaryBanner');
    expect(billing).toContain('<PlanSummaryBanner');
    expect(settings).toContain('<PlanSummaryBanner');
    expect(existsSync('src/components/billing/BillingPlanBanner.tsx')).toBe(false);
  });
});
