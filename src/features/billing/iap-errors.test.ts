import { describe, expect, test } from 'bun:test';
import { isAlreadyOwnedPurchaseError } from './iap-errors';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('IAP error classification', () => {
  test('recognizes store responses for an existing subscription', () => {
    expect(isAlreadyOwnedPurchaseError({ code: 'already-owned' })).toBe(true);
    expect(isAlreadyOwnedPurchaseError({ code: 'duplicate-purchase' })).toBe(true);
    expect(isAlreadyOwnedPurchaseError({ code: 'E_ALREADY_OWNED' })).toBe(true);
    expect(isAlreadyOwnedPurchaseError({ message: "You're currently subscribed to this." })).toBe(true);
  });

  test('does not classify cancellation or ordinary purchase failures as ownership', () => {
    expect(isAlreadyOwnedPurchaseError({ code: 'user-cancelled' })).toBe(false);
    expect(isAlreadyOwnedPurchaseError({ code: 'network-error' })).toBe(false);
    expect(isAlreadyOwnedPurchaseError(undefined)).toBe(false);
  });

  test('checkout restores an already-owned subscription before reporting failure', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/settings/billing-flow.ts'),
      'utf8',
    );

    expect(source).toContain('isAlreadyOwnedPurchaseError(err)');
    expect(source).toContain('await iapService.restorePurchases()');
    expect(source).toContain("toast('Your existing subscription has been restored.', 'success')");
  });
});
