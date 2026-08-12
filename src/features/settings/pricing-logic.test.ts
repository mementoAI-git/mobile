// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const logic = readFileSync('src/hooks/use-pricing-logic.ts', 'utf8');
const screen = readFileSync('app/pricing.tsx', 'utf8');

describe('Pricing logic', () => {
  test('uses toast-based billing errors instead of native alerts', () => {
    expect(logic).toContain('useToast');
    expect(logic).toContain("toast('Could not start checkout. Please try again.', 'error')");
    expect(logic).toContain("toast(err?.message || 'A billing error occurred. Please try again.', 'error')");
    expect(logic).not.toContain('Alert.alert(');
  });

  test('keeps pricing screen wired to the centralized logic hook', () => {
    expect(screen).toContain('usePricingLogic');
    expect(screen).toContain("handleCheckout('pro')");
    expect(screen).toContain("handleCheckout('legacy')");
    expect(screen).toContain("handleCheckout('lifetime')");
  });
});