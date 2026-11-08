// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const billingScreen = readFileSync('app/settings/billing.tsx', 'utf8');
const upgradePrompt = readFileSync('src/components/sheets/UpgradePromptSheet.tsx', 'utf8');
const billingFlow = readFileSync('src/features/settings/billing-flow.ts', 'utf8');
const billingHook = readFileSync('src/hooks/use-billing-settings-logic.ts', 'utf8');

describe('billing module consistency', () => {
  test('billing settings screen uses shared billing queries and actions', () => {
    expect(billingScreen).toContain('useBillingSettingsLogic');
    expect(billingScreen).not.toContain("queryKey: ['invoices']");
    expect(billingScreen).not.toContain("queryKey: ['billing-usage']");
  });

  test('period-end cancellation remains resumable while the plan is active (on the Plans page)', () => {
    expect(billingHook).toContain("summary?.cancel_at_period_end");
    const planState = readFileSync('src/features/billing/plan-state.ts', 'utf8');
    expect(planState).toContain("action: store ? 'store' : 'resume'");
  });

  test('billing settings hook owns the shared billing orchestration', () => {
    expect(billingHook).toContain('useBillingInvoices');
    expect(billingHook).toContain('useBillingUsage');
    expect(billingHook).toContain('openBillingPortal');
    expect(billingHook).toContain('redeemBillingPromo');
    expect(billingHook).toContain("openSheet('cancel-subscription-confirmation')");
    expect(billingHook).toContain('resumeBillingSubscription');
  });

  test('upgrade prompt uses shared checkout flow and avoids native alerts', () => {
    expect(upgradePrompt).toContain('launchBillingCheckout');
    expect(upgradePrompt).not.toContain('alert(');
    expect(upgradePrompt).not.toContain('endpoint.billingCheckout');
  });

  test('shared billing flow exposes the central checkout and portal helpers', () => {
    expect(billingFlow).toContain('export async function launchBillingCheckout');
    expect(billingFlow).toContain('export async function openBillingPortal');
    expect(billingFlow).toContain('export async function redeemBillingPromo');
    expect(billingFlow).toContain('export async function cancelBillingSubscription');
    expect(billingFlow).toContain('export async function resumeBillingSubscription');
  });
});
