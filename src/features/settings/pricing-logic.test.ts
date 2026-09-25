// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const logic = readFileSync('src/hooks/use-pricing-logic.ts', 'utf8');
const screen = readFileSync('app/pricing.tsx', 'utf8');

describe('Pricing logic', () => {
  test('uses the shared billing checkout helper instead of duplicating checkout requests', () => {
    expect(logic).toContain('launchBillingCheckout');
    expect(logic).not.toContain('endpoint.billingCheckout');
    expect(logic).not.toContain('Alert.alert(');
  });

  test('does not offer lifetime purchases and supports restore flow', () => {
    expect(logic).not.toContain("lifetime: 999");
    expect(logic).toContain('handleRestore');
    expect(logic).toContain('restoreBillingPurchases');
  });

  test('keeps pricing screen wired to the centralized logic hook', () => {
    expect(screen).toContain('usePricingLogic');
    expect(screen).toContain("handleCheckout('pro')");
    expect(screen).toContain('useSubscription');
    expect(screen).toContain("openSheet('cancel-subscription-confirmation')");
    expect(screen).not.toContain("handleCheckout('legacy')");
  });
});
