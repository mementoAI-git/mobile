import type * as SentryModule from '@sentry/react-native';
import type { FreeTrial } from './intro-offer';

/**
 * Why the store paywall did or didn't promise the free trial. Production logs
 * nothing from handled errors, so this is the only record of whether StoreKit
 * returned no offer, said the Apple ID had used it, or failed the check.
 */
export type TrialStatus = 'shown' | 'no-offer' | 'not-eligible' | 'eligibility-error';

export function trialStatus(product: {
  freeTrial?: FreeTrial | null;
  introOfferEligible?: boolean;
  eligibilityError?: string;
}): TrialStatus {
  if (!product.freeTrial) return 'no-offer';
  if (product.introOfferEligible === true) return 'shown';
  return product.eligibilityError ? 'eligibility-error' : 'not-eligible';
}

let reported = false;

export function resetTrialReportForTesting() {
  reported = false;
}

/** One Sentry event per app launch, tagged per plan. Never throws. */
export function reportTrialStatus(
  sentry: Pick<typeof SentryModule, 'captureMessage'>,
  products: {
    interval: string;
    freeTrial?: FreeTrial | null;
    introOfferEligible?: boolean;
  }[],
  eligibilityError?: string,
) {
  if (reported || products.length === 0) return;
  reported = true;
  try {
    const tags: Record<string, string> = {};
    for (const product of products) {
      tags[`iap.trial_${product.interval}`] = trialStatus({ ...product, eligibilityError });
    }
    sentry.captureMessage('iap.trial_status', {
      level: 'info',
      tags,
      extra: eligibilityError ? { eligibilityError } : {},
    });
  } catch {
    // Diagnostics must never affect the paywall.
  }
}
