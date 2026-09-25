// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('voice entitlement handling', () => {
  test('classifies only the voice-plan 402 response as an upgrade requirement', async () => {
    let feature: typeof import('./voice-entitlement') | undefined;
    try {
      feature = await import('./voice-entitlement');
    } catch {
      // Expected on the first red run.
    }

    expect(feature?.getVoiceConnectionFailure).toBeFunction();
    expect(feature?.getVoiceConnectionFailure({
      status: 402,
      message: 'Voice mode requires Pro or Legacy.',
    })).toEqual({ kind: 'upgrade-required' });
    expect(feature?.getVoiceConnectionFailure({
      status: 402,
      error: 'subscription_required',
      feature: 'voice_mode',
      message: 'Upgrade to continue.',
    })).toEqual({ kind: 'upgrade-required' });
    expect(feature?.getVoiceConnectionFailure({
      status: 402,
      error: 'subscription_required',
      feature: 'storage',
      message: 'Storage limit reached.',
    })).toEqual({
      kind: 'connection-error',
      message: 'Storage limit reached.',
    });
    expect(feature?.getVoiceConnectionFailure({
      status: 500,
      message: 'Voice service unavailable.',
    })).toEqual({
      kind: 'connection-error',
      message: 'Voice service unavailable.',
    });
  });

  test('maps each displayed plan to the correct checkout tier and interval', async () => {
    const { getVoiceUpgradeCheckout } = await import('./voice-entitlement');

    expect(getVoiceUpgradeCheckout('monthly')).toEqual({ tier: 'pro', interval: 'monthly' });
    expect(getVoiceUpgradeCheckout('annual')).toEqual({ tier: 'pro', interval: 'annual' });
  });
});
