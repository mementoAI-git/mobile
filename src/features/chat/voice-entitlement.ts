import type {
  BillingCheckoutInterval,
  BillingCheckoutTier,
} from '@/features/settings/billing-flow';

export type VoiceUpgradePlan = 'monthly' | 'annual' | 'lifetime';

export type VoiceConnectionFailure =
  | { kind: 'upgrade-required' }
  | { kind: 'connection-error'; message: string };

export function getVoiceConnectionFailure(error: unknown): VoiceConnectionFailure {
  const apiError = error as { status?: number; message?: string } | null;
  if (
    apiError?.status === 402
    && /voice mode requires (pro|legacy)/i.test(apiError.message ?? '')
  ) {
    return { kind: 'upgrade-required' };
  }

  return {
    kind: 'connection-error',
    message: apiError?.message || 'Voice mode could not connect. Please try again.',
  };
}

export function getVoiceUpgradeCheckout(plan: VoiceUpgradePlan): {
  tier: BillingCheckoutTier;
  interval: BillingCheckoutInterval;
} {
  return plan === 'lifetime'
    ? { tier: 'legacy', interval: 'lifetime' }
    : { tier: 'pro', interval: plan };
}
