import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {toBillingCountryCode} from './billing-profile-update';
import {formatInvoiceAmount, formatInvoiceDate} from './billing-invoice-presentation';

const read = (path: string) => readFileSync(path, 'utf8');

describe('billing reference interactions', () => {
  test('normalizes reference and provider country values for Polar', () => {
    expect(toBillingCountryCode('Nigeria')).toBe('NG');
    expect(toBillingCountryCode('us')).toBe('US');
  });

  test('formats Polar minor-unit invoice amounts and reference dates', () => {
    expect(formatInvoiceAmount({amount: 1000, currency: 'USD'})).toBe('$10');
    expect(formatInvoiceDate('2026-08-26T12:00:00.000Z')).toContain('26 Aug 2026');
  });
  test('renders invoices as a real ledger rather than generic buttons', () => {
    const source = read('src/components/billing/BillingInvoicesPanel.tsx');
    expect(source).toContain('formatInvoiceAmount');
    expect(source).toContain('formatInvoiceDate');
    expect(source).toContain('BillingStatusBadge');
    expect(source).not.toContain('variant="outline" size="lg" fullWidth');
  });

  test('does not register fake edit-details and payment-method sheets', () => {
    const manager = read('src/components/sheets/SheetManager.tsx');
    const store = read('src/store/ui.store.ts');
    expect(manager).not.toContain("'edit-billing-details'");
    expect(manager).not.toContain("'add-payment-method'");
    expect(store).not.toContain("| 'edit-billing-details'");
    expect(store).not.toContain("| 'add-payment-method'");
  });

  test('keeps billing sheet footers inside the fixed-height sheet viewport', () => {
    const details = read('src/components/sheets/EditBillingDetailsSheet.tsx');
    const payment = read('src/components/sheets/AddPaymentMethodSheet.tsx');
    expect(details).toContain('<View style={{flex: 1}}>');
    expect(payment).toContain('<View style={{flex: 1}}>');
    expect(details).not.toContain('BottomSheetView');
    expect(payment).not.toContain('BottomSheetView');
    expect(details).toContain('getSheetBottomPadding');
    expect(payment).toContain('getSheetBottomPadding');
  });

  test('routes billing actions to the real provider', () => {
    const screen = read('app/settings/billing.tsx');
    const logic = read('src/hooks/use-billing-settings-logic.ts');
    // Store subscribers manage payment in the store; nothing links out to web billing.
    expect(screen).toContain('onPress={openStoreManagement}');
    expect(screen).not.toContain('openPortal');
    expect(logic).not.toContain("openSheet('edit-billing-details'");
    expect(logic).not.toContain("openSheet('add-payment-method'");
  });

  test('never posts raw card details through the Memento API', () => {
    const source = read('src/components/sheets/AddPaymentMethodSheet.tsx');
    expect(source).toContain('openBillingPortal');
    expect(source).not.toContain('card_number:');
    expect(source).not.toContain('security_code:');
    expect(source).not.toContain('endpoint.billing');
    expect(source).toContain('!canManage');
    expect(source).toContain('onUpgrade?.()');
  });
});
