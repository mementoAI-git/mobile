/**
 * Every button, label and message on the plans page, for each subscription
 * state. Ported from web `src/features/pricing/plan-state.ts`, plus App Store and
 * Google Play billing, which are changed and cancelled in the store rather than
 * through the web billing portal. Keep the two in step.
 */
import dayjs from 'dayjs';
import type { SubscriptionSummary } from '@/features/settings/billing-adapters';

export type BillingInterval = 'monthly' | 'annual';
/** checkout: buy Pro. manage: the store's subscription settings, or the web billing portal. */
export type ProAction = 'checkout' | 'manage' | null;
/** "hidden" is for accounts with no billing period, where a selection would misstate it. */
export type IntervalControl = 'enabled' | 'disabled' | 'hidden';
/** cancel/resume run here for web billing; store billing opens the store's settings. */
export type CancelRowAction = 'cancel' | 'resume' | 'store';

export interface PlanState {
  interval: BillingInterval;
  intervalControl: IntervalControl;
  pro: { label: string; action: ProAction };
  free: { label: string; canDowngrade: boolean };
  cancelRow: { title: string; body: string; action: CancelRowAction; buttonLabel: string } | null;
  note: string | null;
}

export interface PlanStateInput {
  summary: SubscriptionSummary | null | undefined;
  loading: boolean;
  error: unknown;
  selectedInterval: BillingInterval | null;
  /** The store (or web checkout) can sell Pro right now. */
  canCheckout: boolean;
  upgradeLabel?: string;
  /** "App Store" or "Google Play", for store billing copy. */
  storeName?: string;
  now?: Date;
}

const isStoreBilled = (summary: SubscriptionSummary) =>
  summary.provider === 'apple' || summary.provider === 'google';

export function billingProviderName(provider: SubscriptionSummary['provider']) {
  if (provider === 'apple') return 'App Store';
  if (provider === 'google') return 'Google Play';
  return 'the web';
}

/** A cancelled subscription whose paid period is over: the member is back on free. */
function hasEndedSubscription(summary: SubscriptionSummary, now: Date) {
  if (summary.status !== 'cancelled') return false;
  return !summary.current_period_end || dayjs(summary.current_period_end).isBefore(dayjs(now));
}

/** Trials are for first-time subscribers only, which the API reports directly. */
function hasHadSubscription(summary: SubscriptionSummary | null | undefined) {
  if (typeof summary?.has_used_trial === 'boolean') return summary.has_used_trial;
  return Boolean(
    summary
      && (summary.status === 'cancelled'
        || summary.cancel_at_period_end
        || summary.current_period_end
        || summary.trial_ends_at
        || summary.interval),
  );
}

/**
 * Whether there is a recurring subscription to change or cancel. Store purchases
 * always are. Web billing follows the API flag; an API that doesn't send it yet
 * counts as manageable when a billing period is attached, as this screen did before.
 */
function canManage(summary: SubscriptionSummary) {
  if (isStoreBilled(summary)) return true;
  if (typeof summary.can_manage_subscription === 'boolean') return summary.can_manage_subscription;
  return Boolean(summary.interval);
}

function withRequestState(state: PlanState, loading: boolean, error: unknown): PlanState {
  if (!loading && !error) return state;
  const label = loading ? 'Loading your plan…' : 'Plan unavailable';
  return { ...state, pro: { label, action: null }, free: { label, canDowngrade: false } };
}

function resolvePlanState({
  summary,
  selectedInterval,
  canCheckout,
  upgradeLabel = 'Start 14-day trial',
  now = new Date(),
}: PlanStateInput): PlanState {
  const subscribed = summary?.interval ?? null;
  const downgrade = (canDowngrade: boolean) => ({ label: 'Downgrade to free', canDowngrade });

  if (!summary || summary.tier === 'free' || (summary.tier === 'pro' && hasEndedSubscription(summary, now))) {
    return {
      interval: selectedInterval ?? 'monthly',
      intervalControl: 'enabled',
      pro: canCheckout
        ? { label: hasHadSubscription(summary) ? 'Subscribe to Pro' : upgradeLabel, action: 'checkout' }
        : { label: 'Purchases unavailable', action: null },
      free: { label: 'Current plan', canDowngrade: false },
      cancelRow: null,
      note: canCheckout ? null : 'The store is still preparing this plan. Please check back shortly.',
    };
  }

  if (summary.tier === 'legacy') {
    return {
      interval: subscribed ?? 'monthly',
      intervalControl: 'hidden',
      pro: { label: 'Included in Legacy', action: null },
      free: downgrade(false),
      cancelRow: null,
      note: null,
    };
  }

  // Pro with nothing to manage: promos, lifetime, or a paused or cancelled web
  // subscription. A checkout here could charge them twice.
  if (!canManage(summary)) {
    const until = summary.current_period_end ? dayjs(summary.current_period_end).format('MMM D, YYYY') : null;
    return {
      interval: subscribed ?? 'monthly',
      intervalControl: subscribed ? 'disabled' : 'hidden',
      pro: { label: 'Current plan', action: null },
      free: downgrade(false),
      cancelRow: null,
      note:
        summary.status === 'cancelled'
          ? `Your subscription is cancelled. You’ll keep Pro features until ${until}.`
          : summary.status === 'paused'
            ? 'Your subscription is paused.'
            : subscribed
              ? 'Your Pro access has no recurring subscription to manage.'
              : null,
    };
  }

  const store = isStoreBilled(summary);
  const storeName = billingProviderName(summary.provider);
  const scheduled = summary.cancel_at_period_end === true;
  const trialing = summary.status === 'trialing';
  const pastDue = summary.status === 'past_due';
  const billedVia = store ? `Billed through ${storeName}.` : null;

  const cancelRow: PlanState['cancelRow'] = scheduled
    ? {
        title: 'Cancellation scheduled',
        body: store
          ? `You’ll keep Pro features until the end of your billing period. Turn auto-renew back on in ${storeName} to keep your plan.`
          : 'You’ll keep Pro features until the end of your billing period.',
        action: store ? 'store' : 'resume',
        buttonLabel: store ? `Open ${storeName}` : 'Keep plan',
      }
    : {
        title: 'Cancel plan',
        body: trialing
          ? 'You’ll keep Pro features until your trial ends.'
          : 'You’ll keep Pro features until the end of your billing period.',
        action: store ? 'store' : 'cancel',
        buttonLabel: 'Cancel plan',
      };

  if (scheduled) {
    return {
      interval: subscribed ?? 'monthly',
      intervalControl: subscribed ? 'disabled' : 'hidden',
      pro: { label: 'Current plan', action: null },
      free: downgrade(false),
      cancelRow,
      note: billedVia,
    };
  }

  if (pastDue) {
    return {
      interval: subscribed ?? 'monthly',
      intervalControl: subscribed ? 'disabled' : 'hidden',
      pro: { label: 'Update payment', action: 'manage' },
      free: downgrade(true),
      cancelRow,
      note: 'Your last payment didn’t go through. Update your payment method to keep Pro.',
    };
  }

  if (!subscribed) {
    return {
      interval: 'monthly',
      intervalControl: 'hidden',
      pro: { label: 'Manage plan', action: 'manage' },
      free: downgrade(true),
      cancelRow,
      note: billedVia,
    };
  }

  const interval = selectedInterval ?? subscribed;
  return {
    interval,
    intervalControl: 'enabled',
    pro: interval === subscribed
      ? { label: 'Current plan', action: null }
      : { label: interval === 'annual' ? 'Upgrade' : 'Switch to monthly', action: 'manage' },
    free: downgrade(true),
    cancelRow,
    note: billedVia,
  };
}

export function getPlanState(input: PlanStateInput): PlanState {
  return withRequestState(resolvePlanState(input), input.loading, input.error);
}

export const PRO_PRICES = { monthly: 9.99, annual: 79 } as const;

/** Web `plan-catalog.ts` feature lists. */
export const FREE_FEATURES = [
  'Add stories, journals, and thoughts',
  'Core chat and memories',
  'Memory insights',
  'Standard uploads and storage (200 MB)',
] as const;
export const PRO_FEATURES = [
  'Everything in Free',
  'Voice mode conversations',
  'Bigger storage (10 GB)',
] as const;
