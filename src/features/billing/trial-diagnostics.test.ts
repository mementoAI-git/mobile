import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  reportTrialStatus,
  resetTrialReportForTesting,
  trialStatus,
} from './trial-diagnostics';

const TRIAL = { unit: 'week' as const, count: 2 };

describe('trialStatus', () => {
  test('shown when the product has a free trial and the Apple ID is eligible', () => {
    expect(trialStatus({ freeTrial: TRIAL, introOfferEligible: true })).toBe('shown');
  });

  test('no-offer when the store returned no free-trial offer', () => {
    expect(trialStatus({ freeTrial: null, introOfferEligible: true })).toBe('no-offer');
  });

  test('not-eligible when StoreKit says the Apple ID used its offer', () => {
    expect(trialStatus({ freeTrial: TRIAL, introOfferEligible: false })).toBe('not-eligible');
  });

  test('eligibility-error when the eligibility check failed', () => {
    expect(
      trialStatus({ freeTrial: TRIAL, introOfferEligible: false, eligibilityError: 'boom' }),
    ).toBe('eligibility-error');
  });
});

// Production had no way to tell why the paywall said "Subscribe to Pro"
// instead of offering the free trial.
describe('reportTrialStatus', () => {
  beforeEach(() => resetTrialReportForTesting());

  const products = [
    { interval: 'monthly' as const, freeTrial: TRIAL, introOfferEligible: false },
    { interval: 'annual' as const, freeTrial: null, introOfferEligible: false },
  ];

  test('tells Sentry why the trial was or was not offered, per plan', () => {
    const captureMessage = mock(() => '');
    reportTrialStatus({ captureMessage }, products, 'Not entitled');

    expect(captureMessage).toHaveBeenCalledTimes(1);
    const [message, context] = captureMessage.mock.calls[0] as unknown as [string, any];
    expect(message).toBe('iap.trial_status');
    expect(context.level).toBe('info');
    expect(context.tags).toEqual({
      'iap.trial_monthly': 'eligibility-error',
      'iap.trial_annual': 'no-offer',
    });
    expect(context.extra).toEqual({ eligibilityError: 'Not entitled' });
  });

  test('reports once per app launch', () => {
    const captureMessage = mock(() => '');
    reportTrialStatus({ captureMessage }, products);
    reportTrialStatus({ captureMessage }, products);
    expect(captureMessage).toHaveBeenCalledTimes(1);
  });

  test('never throws when Sentry does', () => {
    const captureMessage = mock(() => {
      throw new Error('sentry down');
    });
    expect(() => reportTrialStatus({ captureMessage }, products)).not.toThrow();
  });
});
