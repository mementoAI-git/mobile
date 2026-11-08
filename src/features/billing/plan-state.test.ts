import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { getPlanState, type PlanStateInput } from './plan-state';
import type { SubscriptionSummary } from '@/features/settings/billing-adapters';

const FUTURE = '2099-01-15T12:00:00.000Z';
const PAST = '2020-01-15T12:00:00.000Z';

function state(summary: Partial<SubscriptionSummary> | null, overrides: Partial<PlanStateInput> = {}) {
  return getPlanState({
    summary: summary && ({ tier: 'pro', status: 'active', ...summary } as SubscriptionSummary),
    loading: false,
    error: null,
    selectedInterval: null,
    canCheckout: true,
    ...overrides,
  });
}
const recurring = { can_manage_subscription: true, interval: 'monthly', provider: 'polar' } as const;

describe('members without a subscription (web plan-state)', () => {
  test.each([
    ['no summary', null, 'Start 14-day trial'],
    ['the free tier', { tier: 'free' }, 'Start 14-day trial'],
    ['a used trial', { tier: 'free', has_used_trial: true }, 'Subscribe to Pro'],
    ['a cancelled subscription past its period', { status: 'cancelled', current_period_end: PAST }, 'Subscribe to Pro'],
    ['a finished trial', { tier: 'free', trial_ends_at: PAST }, 'Subscribe to Pro'],
  ] as const)('can start checkout from %s', (_, summary, label) => {
    const plan = state(summary as Partial<SubscriptionSummary> | null);
    expect(plan.pro).toEqual({ label, action: 'checkout' });
    expect(plan.free).toEqual({ label: 'Current plan', canDowngrade: false });
    expect(plan.intervalControl).toBe('enabled');
    expect(plan.cancelRow).toBeNull();
  });

  test('explains when the store cannot sell the plan yet', () => {
    const plan = state({ tier: 'free' }, { canCheckout: false });
    expect(plan.pro).toEqual({ label: 'Purchases unavailable', action: null });
    expect(plan.note).toContain('store is still preparing');
  });
});

describe('recurring web subscriptions', () => {
  test('marks the subscribed interval as current and offers a switch', () => {
    expect(state(recurring).pro).toEqual({ label: 'Current plan', action: null });
    expect(state(recurring, { selectedInterval: 'annual' }).pro).toEqual({ label: 'Upgrade', action: 'manage' });
    expect(state({ ...recurring, interval: 'annual' }, { selectedInterval: 'monthly' }).pro.label).toBe('Switch to monthly');
    expect(state(recurring).free).toEqual({ label: 'Downgrade to free', canDowngrade: true });
    expect(state(recurring).cancelRow?.action).toBe('cancel');
  });

  test('a scheduled cancellation can be kept', () => {
    const plan = state({ ...recurring, cancel_at_period_end: true, current_period_end: FUTURE });
    expect(plan.cancelRow).toMatchObject({ title: 'Cancellation scheduled', action: 'resume', buttonLabel: 'Keep plan' });
    expect(plan.intervalControl).toBe('disabled');
    expect(plan.free.canDowngrade).toBe(false);
  });

  test('a failed payment asks for a new payment method', () => {
    const plan = state({ ...recurring, status: 'past_due' });
    expect(plan.pro).toEqual({ label: 'Update payment', action: 'manage' });
    expect(plan.note).toContain('payment didn’t go through');
  });

  test('pro with nothing to manage never offers checkout', () => {
    const plan = state({ can_manage_subscription: false });
    expect(plan.pro).toEqual({ label: 'Current plan', action: null });
    expect(plan.intervalControl).toBe('hidden');
    expect(plan.cancelRow).toBeNull();
  });

  test('legacy and loading states', () => {
    expect(state({ tier: 'legacy' }).pro.label).toBe('Included in Legacy');
    // No "no billing period" notes: they read as an error to members.
    expect(state({ tier: 'legacy' }).note).toBeNull();
    expect(state({ can_manage_subscription: false }).note).toBeNull();
    expect(state(recurring, { loading: true }).pro).toEqual({ label: 'Loading your plan…', action: null });
    expect(state(recurring, { error: new Error('x') }).free.label).toBe('Plan unavailable');
  });
});

describe('App Store and Google Play subscriptions', () => {
  test('are managed and cancelled in the store', () => {
    const plan = state({ provider: 'apple', interval: 'monthly' }, { selectedInterval: 'annual' });
    expect(plan.pro).toEqual({ label: 'Upgrade', action: 'manage' });
    expect(plan.cancelRow).toMatchObject({ action: 'store', buttonLabel: 'Cancel plan' });
    expect(plan.note).toBe('Billed through App Store.');
  });

  test('a scheduled store cancellation points back to the store', () => {
    const plan = state({ provider: 'google', interval: 'annual', cancel_at_period_end: true, current_period_end: FUTURE });
    expect(plan.cancelRow).toMatchObject({ action: 'store', buttonLabel: 'Open Google Play' });
  });
});

describe('plans screen', () => {
  const screen = readFileSync('app/pricing.tsx', 'utf8');

  test('stacks the Free and Pro cards like web and takes every label from getPlanState', () => {
    expect(screen).toContain('getPlanState(');
    expect(screen.indexOf('>Free<')).toBeLessThan(screen.indexOf('>Pro<'));
    expect(screen).toContain('{plan.pro.label}');
    expect(screen).toContain('{plan.free.label}');
    expect(screen).toContain('Plans that grow with your memories');
    expect(screen).toContain('accessibilityLabel="Billing period"');
  });

  test('is theme adaptive: no white overlays, raw hex or fixed images', () => {
    expect(screen).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(screen).not.toMatch(/rgba\(255,\s*255,\s*255/);
    expect(screen).not.toContain('bg-white');
    expect(screen).not.toContain('pro-plan-gradient');
    expect(screen).toContain('useThemeStyles(createStyles)');
  });

  test('keeps the store requirements: restore purchases and the disclosure links', () => {
    expect(screen).toContain('Restore Purchases');
    expect(screen).toMatch(/<Button variant="secondary"[^>]*onPress=\{handleRestore\}/);
    expect(screen).toContain('getIapDisclosureCopy()');
    expect(screen).toContain('Terms of Use');
    expect(screen).toContain('Privacy Policy');
  });
});
