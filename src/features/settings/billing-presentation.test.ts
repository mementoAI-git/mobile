import { describe, expect, test } from 'bun:test';
import { BILLING_REFERENCE_FIXTURE } from './billing-fixture';
import {
  getBillingTierPresentation,
  resolveBillingProfile,
} from './billing-presentation';

describe('billing presentation', () => {
  test('resolves profile from live data or derives from authenticated user', () => {
    const user = {
      email: 'alex@example.com',
      first_name: 'Alex',
      last_name: 'Rivera',
      location: 'San Francisco, CA',
      country: 'US',
    };
    expect(resolveBillingProfile(null, user)).toEqual({
      profile: {
        email: 'alex@example.com',
        name: 'Alex Rivera',
        address: {
          line1: 'San Francisco, CA',
          country: 'US',
        },
        paymentMethods: [],
        management: 'polar_portal',
      },
      source: 'user',
    });

    const live = {
      email: 'live@example.com',
      name: 'Live Customer',
      address: null,
      paymentMethods: [],
      management: 'polar_portal' as const,
    };
    expect(resolveBillingProfile(live, user)).toEqual({ profile: live, source: 'live' });
  });

  test('derives one screen with tier-specific plan actions', () => {
    expect(getBillingTierPresentation('free')).toMatchObject({
      title: 'Unlock more with Pro', actionLabel: 'Upgrade', action: 'upgrade',
    });
    expect(getBillingTierPresentation('pro')).toMatchObject({
      title: 'You’re on Memento Pro', actionLabel: 'Manage plan', action: 'portal',
    });
    expect(getBillingTierPresentation('legacy')).toMatchObject({
      title: 'Your Legacy plan', actionLabel: 'Manage', action: 'portal',
    });
  });

  test('provides the reference paid-plan copy and active status', () => {
    expect(getBillingTierPresentation('pro')).toEqual({
      title: 'You’re on Memento Pro',
      subtitle: 'You have full access to Pro features, expanded storage, and richer memory context.',
      actionLabel: 'Manage plan',
      action: 'portal',
      variant: 'paid',
      statusLabel: 'Active',
    });
  });
});
