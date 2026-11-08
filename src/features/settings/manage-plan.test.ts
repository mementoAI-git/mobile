import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  CANCELLATION_REASONS,
  buildCancellationPayload,
} from './subscription-cancellation';

const read = (path: string) => readFileSync(path, 'utf8');

describe('manage-plan flow', () => {
  test('requires an explanation only for the something-else reason', () => {
    expect(buildCancellationPayload('too_expensive', '')).toEqual({ reason: 'too_expensive' });
    expect(buildCancellationPayload('other', '  Moving abroad  ')).toEqual({
      reason: 'other',
      details: 'Moving abroad',
    });
    expect(buildCancellationPayload('other', '   ')).toBeNull();
    expect(CANCELLATION_REASONS).toHaveLength(6);
  });

  test('uses subscription state for tier-aware plan actions (web plan-state)', () => {
    const screen = read('app/pricing.tsx');
    const planState = read('src/features/billing/plan-state.ts');
    expect(screen).toContain('getPlanState(');
    expect(planState).toContain('Downgrade to free');
    expect(planState).toContain('Current plan');
    expect(planState).toContain('Start 14-day trial');
    expect(screen).not.toContain('Legacy Plan');
  });

  test('keeps plan screens on the shared accessible header and uses safe fallback navigation', () => {
    const header = read('src/components/settings/SettingsSubpageHeader.tsx');
    expect(header).toContain('accessibilityLabel="Go back"');

    for (const path of ['app/pricing.tsx', 'app/settings/cancel-plan.tsx']) {
      const screen = read(path);
      expect(screen).toContain('safeBack(router');
      expect(screen).toContain('<SettingsSubpageHeader');
      expect(screen).not.toContain('className="absolute left-4"');
    }
  });

  test('registers a dedicated cancellation confirmation sheet', () => {
    const manager = read('src/components/sheets/SheetManager.tsx');
    const store = read('src/store/ui.store.ts');
    expect(manager).toContain("'cancel-subscription-confirmation'");
    expect(store).toContain("| 'cancel-subscription-confirmation'");
  });

  test('submits cancellation feedback only from the final reason screen', () => {
    const screen = read('app/settings/cancel-plan.tsx');
    const flow = read('src/features/settings/billing-flow.ts');
    expect(screen).toContain('buildCancellationPayload');
    expect(screen).toContain('cancelBillingSubscription');
    expect(flow).toContain('feedback?: BillingCancellationFeedback');
  });

  test('keeps manage plan scrollable with flex container and bottom padding', () => {
    const screen = read('app/pricing.tsx');
    expect(screen).toMatch(/<ScrollView[^>]*className="[^"]*flex-1/);
    expect(screen).toMatch(/contentContainerStyle=\{\{[^}]*paddingBottom:\s*56/);
  });

  test('routes store-managed subscriptions to native management on cancellation', () => {
    const screen = read('app/pricing.tsx');
    expect(screen).toContain("summary?.provider === 'apple' || summary?.provider === 'google'");
    expect(screen).toContain('iapService.openSubscriptionManagement()');
  });
});
