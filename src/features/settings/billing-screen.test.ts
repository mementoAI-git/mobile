import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const screen = readFileSync('app/settings/billing.tsx', 'utf8');

describe('tier-aware billing screen', () => {
  test('composes the supplied single-screen reference', () => {
    for (const component of ['BillingTabs', 'PlanSummaryBanner', 'BillingStorageCard', 'BillingInvoicesPanel']) {
      expect(screen).toContain(component);
    }
    expect(screen).toContain('router.canGoBack()');
    expect(screen).toContain('RefreshControl');
    // Web billing.tsx sections.
    // No billing details or payment methods on mobile: store purchases keep them
    // in the store, and web subscribers edit them on the website.
    expect(screen).not.toContain('BillingDetailsSection');
    expect(screen).not.toContain('BillingPaymentMethodsSection');
    expect(screen).not.toContain('Billing details');
    expect(screen).toContain('Promo code');
    expect(screen).toContain('periodLabel={periodLabel}');
    // Paid plans: web's neutral Pro card instead of the orange banner.
    expect(screen).toContain('{isProOrAbove ? (\n              <ProPlanCard');
    const card = readFileSync('src/components/subscription/ProPlanCard.tsx', 'utf8');
    expect(card).toContain('backgroundColor: colors.fillWeak');
    expect(card).not.toMatch(/LinearGradient|#[0-9a-fA-F]{6}|rgba\(/);
  });

  test('store subscribers are sent to the store for payment details', () => {
    expect(screen).toContain('Your payment details are managed in');
    expect(screen).toContain('onPress={openStoreManagement}');
  });

  test('cancel, resume and restore live on the Plans page, not here', () => {
    expect(screen).not.toContain('Cancel subscription');
    expect(screen).not.toContain('Resume subscription');
    expect(screen).not.toContain('Restore Purchases');
  });
});

describe('promo code', () => {
  test('Redeem lights up with the active fill once a code is entered', () => {
    expect(screen).toContain("className={promo.trim() ? 'bg-active-fill' : undefined}");
    expect(screen).toContain("textClassName={promo.trim() ? 'text-active-text' : undefined}");
    expect(screen).toContain('disabled={promoBusy || !promo.trim()}');
  });
});

describe('invoices tab', () => {
  test('shows only the invoice list; the promo code stays on Overview, never on iOS', () => {
    const promo = screen.indexOf('Promo code</Text>');
    const guard = screen.lastIndexOf("{activeTab === 'overview' && canRedeemPromoCode(Platform.OS) ? (", promo);
    expect(guard).toBeGreaterThan(screen.indexOf('<BillingInvoicesPanel'));
  });
});
