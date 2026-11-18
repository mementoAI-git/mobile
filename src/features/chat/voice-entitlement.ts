import type {
  BillingCheckoutInterval,
  BillingCheckoutTier,
} from '@/features/settings/billing-flow';

export type VoiceUpgradePlan = 'monthly' | 'annual';

export type VoiceConnectionFailure =
  | { kind: 'upgrade-required' }
  | { kind: 'connection-error'; message: string };

export function getVoiceConnectionFailure(error: unknown): VoiceConnectionFailure {
  const apiError = error as {
    status?: number;
    message?: string;
    error?: string;
    feature?: string;
    data?: { error?: string; feature?: string };
    details?: { error?: string; feature?: string };
  } | null;
  const gateError = apiError?.error ?? apiError?.data?.error ?? apiError?.details?.error;
  const gateFeature = apiError?.feature ?? apiError?.data?.feature ?? apiError?.details?.feature;
  if (
    apiError?.status === 402
    && (
      (gateError === 'subscription_required' && gateFeature === 'voice_mode')
      || /voice mode requires (pro|legacy)/i.test(apiError.message ?? '')
    )
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
  return { tier: 'pro', interval: plan };
}
