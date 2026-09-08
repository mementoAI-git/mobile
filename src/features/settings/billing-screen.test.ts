import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const screen = readFileSync('app/settings/billing.tsx', 'utf8');

describe('tier-aware billing screen', () => {
  test('composes the supplied single-screen reference', () => {
    for (const component of ['BillingTabs', 'BillingPlanBanner', 'BillingStorageCard', 'BillingDetailsSection', 'BillingPaymentMethodsSection', 'BillingInvoicesPanel']) {
      expect(screen).toContain(component);
    }
    expect(screen).toContain('router.canGoBack()');
    expect(screen).toContain('RefreshControl');
  });
});
