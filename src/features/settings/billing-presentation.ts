import type { IUser } from '@/types';
import type { BillingProfile, SubscriptionSummary } from './billing-adapters';

export type BillingProfileSource = 'live' | 'user';

export function resolveBillingProfile(
  profile?: BillingProfile | null,
  user?: Partial<IUser> | null,
): {
  profile: BillingProfile;
  source: BillingProfileSource;
} {
  if (profile) {
    return { profile, source: 'live' };
  }

  const fullName = user?.fullname
    || [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
    || null;
  const addressLine = user?.location || undefined;
  const country = user?.country || undefined;

  return {
    profile: {
      email: user?.email ?? null,
      name: fullName,
      address: (addressLine || country) ? {
        line1: addressLine,
        country: country,
      } : null,
      paymentMethods: [],
      management: 'polar_portal',
    },
    source: 'user',
  };
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
