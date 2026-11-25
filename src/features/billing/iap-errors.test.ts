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

// A test purchase on Play succeeded, verification failed on the server, and the
// app showed "[object Object]".
describe('purchaseVerificationError', () => {
  const { purchaseVerificationError, PURCHASE_NOT_CONFIRMED_MESSAGE } = require('./iap-errors');

  test('a plain API error object becomes a readable message, never [object Object]', () => {
    const err = purchaseVerificationError({
      message: 'Google Play purchase verification service is not configured on the server',
      status: 503,
      httpStatus: 503,
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(PURCHASE_NOT_CONFIRMED_MESSAGE);
    expect(err.message).not.toContain('[object Object]');
    expect(err.cause).toBe('Google Play purchase verification service is not configured on the server');
    expect(err.status).toBe(503);
  });

  test('keeps the detail of a thrown Error for logs', () => {
    const err = purchaseVerificationError(new Error('Purchase verification failed on the server.'));
    expect(err.message).toBe(PURCHASE_NOT_CONFIRMED_MESSAGE);
    expect(err.cause).toBe('Purchase verification failed on the server.');
  });

  test('handles values with no message', () => {
    expect(purchaseVerificationError(undefined).message).toBe(PURCHASE_NOT_CONFIRMED_MESSAGE);
    expect(purchaseVerificationError('boom').cause).toBe('boom');
  });
});
