import { describe, expect, test } from 'bun:test';
import { BILLING_REFERENCE_FIXTURE } from './billing-fixture';
import {
  getBillingTierPresentation,
  resolveBillingProfile,
} from './billing-presentation';

describe('billing presentation', () => {
  test('uses the exact reference fixture until live profile data replaces it', () => {
    expect(resolveBillingProfile(null)).toEqual({
      profile: BILLING_REFERENCE_FIXTURE,
      source: 'fixture',
    });
    const live = {...BILLING_REFERENCE_FIXTURE, email: 'live@example.com'};
    expect(resolveBillingProfile(live)).toEqual({profile: live, source: 'live'});
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
