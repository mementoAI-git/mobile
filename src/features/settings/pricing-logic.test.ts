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

  test('normalizes lifetime purchases to legacy tier with lifetime interval', () => {
    expect(logic).toContain("const normalizedTier = tier === 'lifetime' ? 'legacy' : tier.toLowerCase();");
    expect(logic).toContain("const normalizedInterval = tier === 'lifetime' ? 'lifetime' : interval;");
  });

  test('keeps pricing screen wired to the centralized logic hook', () => {
    expect(screen).toContain('usePricingLogic');
    expect(screen).toContain("handleCheckout('pro')");
    expect(screen).toContain('useSubscription');
    expect(screen).toContain("openSheet('cancel-subscription-confirmation')");
    expect(screen).not.toContain("handleCheckout('legacy')");
  });
});
