import { describe, expect, test } from 'bun:test';
import {
  extractBillingUrl,
  normalizeBillingProfile,
  normalizeBillingInvoices,
  normalizeBillingUsage,
  normalizeSubscriptionSummary,
} from './billing-adapters';
import { BILLING_REFERENCE_FIXTURE } from './billing-fixture';

describe('mobile Polar billing adapters', () => {
  test('normalizes billing identity and redacted methods', () => {
    expect(normalizeBillingProfile({data: {
      email: 'owner@example.com',
      name: 'Owner Name',
      address: {postal_code: '520231', country: 'NG'},
      payment_methods: [
        {id: 'pm_1', brand: 'mastercard', last4: '1312', is_default: true},
        {id: 'bad', brand: 'visa', last4: '12', is_default: false},
      ],
      management: 'polar_portal',
    }})).toEqual({
      email: 'owner@example.com',
      name: 'Owner Name',
      address: {postalCode: '520231', country: 'NG'},
      paymentMethods: [
        {id: 'pm_1', brand: 'mastercard', last4: '1312', isDefault: true},
      ],
      management: 'polar_portal',
    });
  });

  test('provides the complete static reference state for visual parity', () => {
    expect(BILLING_REFERENCE_FIXTURE.paymentMethods).toHaveLength(3);
    expect(BILLING_REFERENCE_FIXTURE.paymentMethods[0]).toMatchObject({
      brand: 'mastercard', last4: '1312', isDefault: true,
    });
    expect(BILLING_REFERENCE_FIXTURE.address).toMatchObject({
      city: 'Uyo', postalCode: '520231', country: 'Nigeria',
    });
  });
  test('normalizes direct and nested subscription payloads', () => {
    expect(normalizeSubscriptionSummary({ data: { tier: 'pro', status: 'active', provider: 'polar' } })).toMatchObject({
      tier: 'pro',
      status: 'active',
      provider: 'polar',
    });
    expect(normalizeSubscriptionSummary({ data: { data: { tier: 'legacy', status: 'canceled' } } })).toMatchObject({
      tier: 'legacy',
      status: 'cancelled',
    });
  });

  test('defaults malformed subscriptions safely and preserves finite usage', () => {
    expect(normalizeSubscriptionSummary({ data: null })).toMatchObject({ tier: 'free', status: 'active' });
    expect(normalizeSubscriptionSummary({ data: {
      tier: 'pro',
      status: 'active',
      usage: {
        storage_used_bytes: 200,
        storage_reserved_bytes: 50,
        storage_limit_bytes: 10_000,
        remaining_bytes: 9_750,
        percent_used: 2,
        over_limit: false,
        ignored: 'x',
      },
    } }).usage).toEqual({
      storage_used_bytes: 200,
      storage_reserved_bytes: 50,
      storage_limit_bytes: 10_000,
      remaining_bytes: 9_750,
      percent_used: 2,
      over_limit: false,
    });
  });

  test('normalizes canonical and legacy usage and invoice collections', () => {
    expect(normalizeBillingUsage({ data: { storage_used_bytes: 5, storage_limit_bytes: 200 } })).toMatchObject({ storage_used_bytes: 5 });
    expect(normalizeBillingUsage({ data: { data: { storage_used_bytes: 7, storage_limit_bytes: 200 } } })).toMatchObject({ storage_used_bytes: 7 });
    expect(normalizeBillingInvoices({ data: [{ label: 'August' }] })).toEqual([{ label: 'August' }]);
    expect(normalizeBillingInvoices({ data: { data: [{ label: 'July' }] } })).toEqual([{ label: 'July' }]);
  });

  test('extracts checkout and portal URLs from either response shape', () => {
    expect(extractBillingUrl({ data: { checkout_url: 'https://polar.sh/checkout' } }, 'checkout_url')).toBe('https://polar.sh/checkout');
    expect(extractBillingUrl({ data: { data: { portal_url: 'https://polar.sh/portal' } } }, 'portal_url')).toBe('https://polar.sh/portal');
    expect(extractBillingUrl({ data: { checkout_url: '' } }, 'checkout_url')).toBeNull();
  });
});
