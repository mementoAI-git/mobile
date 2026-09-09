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

  test('registers dedicated edit-details and payment-method sheets', () => {
    const manager = read('src/components/sheets/SheetManager.tsx');
    const store = read('src/store/ui.store.ts');
    expect(manager).toContain("'edit-billing-details'");
    expect(manager).toContain("'add-payment-method'");
    expect(store).toContain("| 'edit-billing-details'");
    expect(store).toContain("| 'add-payment-method'");
  });

  test('keeps billing sheet footers inside the fixed-height sheet viewport', () => {
    const details = read('src/components/sheets/EditBillingDetailsSheet.tsx');
    const payment = read('src/components/sheets/AddPaymentMethodSheet.tsx');
    expect(details).toContain('<BottomSheetView style={{flex: 1}}>');
    expect(payment).toContain('<BottomSheetView style={{flex: 1}}>');
  });

  test('routes billing actions to the reference sheets', () => {
    const screen = read('app/settings/billing.tsx');
    const logic = read('src/hooks/use-billing-settings-logic.ts');
    expect(screen).toContain('handleEditBillingDetails');
    expect(screen).toContain('handleAddPaymentMethod');
    expect(logic).toContain("openSheet('edit-billing-details'");
    expect(logic).toContain("openSheet('add-payment-method'");
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
