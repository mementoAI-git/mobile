import type { BillingProfile, SubscriptionSummary } from './billing-adapters';
import { BILLING_REFERENCE_FIXTURE } from './billing-fixture';

export type BillingProfileSource = 'live' | 'fixture';

export function resolveBillingProfile(profile: BillingProfile | null | undefined): {
  profile: BillingProfile;
  source: BillingProfileSource;
} {
  return profile
    ? {profile, source: 'live'}
    : {profile: BILLING_REFERENCE_FIXTURE, source: 'fixture'};
}

export function getBillingTierPresentation(tier: SubscriptionSummary['tier']) {
  if (tier === 'pro') {
    return {
      title: 'You’re on Memento Pro',
      subtitle: 'You have full access to Pro features, expanded storage, and richer memory context.',
      actionLabel: 'Manage plan',
      action: 'portal' as const,
      variant: 'paid' as const,
      statusLabel: 'Active',
    };
  }
  if (tier === 'legacy') {
    return {
      title: 'Your Legacy plan',
      subtitle: 'Your memories, legacy tools and long-term storage are protected.',
      actionLabel: 'Manage',
      action: 'portal' as const,
      variant: 'paid' as const,
      statusLabel: 'Active',
    };
  }
  return {
    title: 'Unlock more with Pro',
    subtitle: 'Advanced features, more storage and better memory contextualization with Pro.',
    actionLabel: 'Upgrade',
    action: 'upgrade' as const,
    variant: 'free' as const,
    statusLabel: null,
  };
}
