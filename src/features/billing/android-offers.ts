/**
 * Google Play subscription offers (Play Billing 5+). Every subscription
 * purchase needs an offer token: either a base plan's own offer or an offer on
 * top of it, like Memento's 14-day free trial for new customers.
 *
 * expo-iap (OpenIAP) lists them on the Android product as `subscriptionOffers`,
 * each with `offerTokenAndroid`, `basePlanIdAndroid`, `id` (the offerId),
 * `paymentMode` and `pricingPhasesAndroid.pricingPhaseList`. Google only
 * returns offers this account is eligible for, so a free-trial offer in the
 * list means the trial can be taken.
 */
import type { FreeTrial, TrialUnit } from './intro-offer';

/** The fields of an expo-iap `PricingPhaseAndroid` read here. */
export interface AndroidPricingPhase {
  billingPeriod?: string | null;
  billingCycleCount?: number | null;
  priceAmountMicros?: string | number | null;
}

/** The fields of an expo-iap `SubscriptionOffer` read here. */
export interface AndroidSubscriptionOffer {
  id?: string | null;
  basePlanIdAndroid?: string | null;
  offerTokenAndroid?: string | null;
  paymentMode?: string | null;
  price?: number | null;
  period?: { unit?: string | null; value?: number | null } | null;
  periodCount?: number | null;
  pricingPhasesAndroid?: { pricingPhaseList?: AndroidPricingPhase[] | null } | null;
}

export interface AndroidOfferSelection {
  /** The token to buy with: the free-trial offer when there is one, else the base plan's. */
  offerToken: string | null;
  /** The base plan's own offer token, the fallback when the chosen one fails. */
  basePlanOfferToken: string | null;
  /** The free trial the chosen offer starts with. */
  freeTrial: FreeTrial | null;
}

const PERIOD = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/;
const UNITS: readonly TrialUnit[] = ['day', 'week', 'month', 'year'];

/**
 * ISO-8601 billing period ("P2W", "P14D", "P1M", "P1Y") as a FreeTrial.
 * A period mixing units ("P1W3D") is counted in days; one mixing months or
 * years with anything else is not a trial length we can phrase, so null.
 */
export function parseBillingPeriod(period: string | null | undefined): FreeTrial | null {
  const match = typeof period === 'string' ? PERIOD.exec(period.trim().toUpperCase()) : null;
  if (!match) return null;
  const [years, months, weeks, days] = match.slice(1).map((part) => (part ? Number(part) : 0));
  const parts = [
    { unit: 'year' as const, count: years },
    { unit: 'month' as const, count: months },
    { unit: 'week' as const, count: weeks },
    { unit: 'day' as const, count: days },
  ].filter((part) => part.count > 0);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  if (years || months) return null;
  return { unit: 'day', count: weeks * 7 + days };
}

const phasesOf = (offer: AndroidSubscriptionOffer) => offer.pricingPhasesAndroid?.pricingPhaseList ?? [];
const isFreePhase = (phase: AndroidPricingPhase) =>
  phase.priceAmountMicros !== null && phase.priceAmountMicros !== undefined && Number(phase.priceAmountMicros) === 0;
const tokenOf = (offer: AndroidSubscriptionOffer) =>
  typeof offer.offerTokenAndroid === 'string' && offer.offerTokenAndroid.length > 0 ? offer.offerTokenAndroid : null;

/** The free trial an offer starts with, from its free pricing phase or OpenIAP's payment mode. */
export function getOfferFreeTrial(offer: AndroidSubscriptionOffer): FreeTrial | null {
  const freePhase = phasesOf(offer).find(isFreePhase);
  if (freePhase) {
    const period = parseBillingPeriod(freePhase.billingPeriod);
    if (!period) return null;
    const cycles = typeof freePhase.billingCycleCount === 'number' && freePhase.billingCycleCount > 1
      ? freePhase.billingCycleCount
      : 1;
    return { unit: period.unit, count: period.count * cycles };
  }
  if (offer.paymentMode === 'free-trial') {
    const unit = offer.period?.unit;
    const value = offer.period?.value;
    if (!UNITS.includes(unit as TrialUnit) || typeof value !== 'number' || value <= 0) return null;
    const periods = typeof offer.periodCount === 'number' && offer.periodCount > 0 ? offer.periodCount : 1;
    return { unit: unit as TrialUnit, count: value * periods };
  }
  return null;
}

/**
 * A base plan's own offer: no free or discounted phase in front of the
 * recurring price (Play gives it a single pricing phase and no offerId).
 */
function isBasePlanOffer(offer: AndroidSubscriptionOffer) {
  const phases = phasesOf(offer);
  if (phases.length > 0) return phases.length === 1 && !isFreePhase(phases[0]);
  return offer.paymentMode !== 'free-trial';
}

/** Picks the offer to buy an Android subscription with. */
export function selectAndroidOffer(product: unknown): AndroidOfferSelection {
  const raw = (product && typeof product === 'object' ? product : {}) as { subscriptionOffers?: unknown };
  const offers = (Array.isArray(raw.subscriptionOffers) ? raw.subscriptionOffers : [])
    .filter((offer): offer is AndroidSubscriptionOffer => Boolean(offer) && typeof offer === 'object')
    .filter((offer) => tokenOf(offer) !== null);

  const basePlan = offers.find(isBasePlanOffer) ?? null;
  const basePlanOfferToken = basePlan ? tokenOf(basePlan) : null;

  for (const offer of offers) {
    const freeTrial = getOfferFreeTrial(offer);
    if (freeTrial) return { offerToken: tokenOf(offer), basePlanOfferToken, freeTrial };
  }

  return {
    offerToken: basePlanOfferToken ?? (offers[0] ? tokenOf(offers[0]) : null),
    basePlanOfferToken,
    freeTrial: null,
  };
}
