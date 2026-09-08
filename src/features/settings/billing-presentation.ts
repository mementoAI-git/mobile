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
      title: 'You’re on Pro',
      subtitle: 'Advanced features, more storage and better memory contextualization with Pro.',
      actionLabel: 'Manage',
      action: 'portal' as const,
    };
  }
  if (tier === 'legacy') {
    return {
      title: 'Your Legacy plan',
      subtitle: 'Your memories, legacy tools and long-term storage are protected.',
      actionLabel: 'Manage',
      action: 'portal' as const,
    };
  }
  return {
    title: 'Unlock more with Pro',
    subtitle: 'Advanced features, more storage and better memory contextualization with Pro.',
    actionLabel: 'Upgrade',
    action: 'upgrade' as const,
  };
}
