/**
 * Free-trial copy for the store paywalls. The App Store applies an
 * introductory offer on its own when the member is eligible, so the trial is
 * only promised when StoreKit reports a free-trial intro offer on the product
 * and says this Apple ID can still redeem it. Google Play purchases don't pass
 * an offer token yet, so Android never promises a trial.
 */
import type { IAPPlanInterval } from './iap-types';

export type TrialUnit = 'day' | 'week' | 'month' | 'year';

/** The whole free period: `count` × `unit` (2 weeks is { unit: 'week', count: 2 }). */
export interface FreeTrial {
  unit: TrialUnit;
  count: number;
}

export const SUBSCRIBE_LABEL = 'Subscribe to Pro';

const UNITS: readonly TrialUnit[] = ['day', 'week', 'month', 'year'];
const isUnit = (value: unknown): value is TrialUnit => UNITS.includes(value as TrialUnit);
const positive = (value: unknown) => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Reads a free-trial introductory offer from an expo-iap subscription product:
 * the standardized `subscriptionOffers` first, then the legacy iOS fields.
 */
export function extractFreeTrial(product: unknown): FreeTrial | null {
  if (!product || typeof product !== 'object') return null;
  const raw = product as Record<string, any>;

  const offers: any[] = Array.isArray(raw.subscriptionOffers) ? raw.subscriptionOffers : [];
  for (const offer of offers) {
    if (offer?.type !== 'introductory' || offer?.paymentMode !== 'free-trial') continue;
    const unit = offer.period?.unit;
    const value = positive(offer.period?.value);
    if (!isUnit(unit) || !value) continue;
    const periods = positive(offer.periodCount ?? offer.numberOfPeriodsIOS) ?? 1;
    return { unit, count: value * periods };
  }

  if (raw.introductoryPricePaymentModeIOS === 'free-trial') {
    const unit = raw.introductoryPriceSubscriptionPeriodIOS;
    const count = positive(raw.introductoryPriceNumberOfPeriodsIOS) ?? 1;
    if (isUnit(unit)) return { unit, count };
  }
  return null;
}

/** "14 days" / "14-day". Weeks read as days, the way the App Store sheet phrases them. */
export function formatTrialLength(trial: FreeTrial) {
  const unit = trial.unit === 'week' ? 'day' : trial.unit;
  const count = trial.unit === 'week' ? trial.count * 7 : trial.count;
  return {
    phrase: `${count} ${unit}${count === 1 ? '' : 's'}`,
    adjective: `${count}-${unit}`,
  };
}

export interface TrialCopyInput {
  platform: string;
  freeTrial: FreeTrial | null | undefined;
  /** StoreKit's intro-offer eligibility for this Apple ID. */
  eligible: boolean | undefined;
  /** The store returned this product (not a fallback). */
  storeAvailable: boolean;
  localizedPrice: string;
  interval: IAPPlanInterval;
}

export interface TrialCopy {
  label: string;
  /** What happens after the trial, shown beside the button. */
  disclosure: string;
}

/** The trial button label and disclosure, or null when no trial applies. */
export function getTrialCopy(input: TrialCopyInput): TrialCopy | null {
  if (input.platform !== 'ios') return null;
  if (!input.storeAvailable || !input.freeTrial || input.eligible !== true) return null;
  const length = formatTrialLength(input.freeTrial);
  const period = input.interval === 'annual' ? 'year' : 'month';
  return {
    label: `Start ${length.adjective} free trial`,
    disclosure: `Free for ${length.phrase}, then ${input.localizedPrice}/${period}. Cancel anytime in Settings.`,
  };
}

/** The Pro checkout label for store billing: the trial when it applies, otherwise a plain subscribe. */
export function getStoreUpgradeLabel(input: TrialCopyInput) {
  return getTrialCopy(input)?.label ?? SUBSCRIBE_LABEL;
}
