import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {
  CANCELLATION_REASONS,
  buildCancellationPayload,
} from './subscription-cancellation';

const read = (path: string) => readFileSync(path, 'utf8');

describe('manage-plan flow', () => {
  test('requires an explanation only for the something-else reason', () => {
    expect(buildCancellationPayload('too_expensive', '')).toEqual({reason: 'too_expensive'});
    expect(buildCancellationPayload('other', '  Moving abroad  ')).toEqual({
      reason: 'other',
      details: 'Moving abroad',
    });
    expect(buildCancellationPayload('other', '   ')).toBeNull();
    expect(CANCELLATION_REASONS).toHaveLength(6);
  });

  test('uses subscription state for tier-aware plan actions', () => {
    const screen = read('app/pricing.tsx');
    expect(screen).toContain('isProOrAbove');
    expect(screen).toContain('Downgrade to Free');
    expect(screen).toContain('Current plan');
    expect(screen).toContain('Start 14-day trial');
    expect(screen).not.toContain('Legacy Plan');
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
});
