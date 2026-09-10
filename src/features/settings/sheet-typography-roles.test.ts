import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('sheet typography roles', () => {
  test('keeps billing form values and payment choices out of editorial title roles', () => {
    const editBilling = read('src/components/sheets/EditBillingDetailsSheet.tsx');
    const addPayment = read('src/components/sheets/AddPaymentMethodSheet.tsx');

    expect(editBilling).not.toContain('TYPE.cardTitle');
    expect(editBilling).toContain('...TYPE.input');
    expect(addPayment).not.toContain('TYPE.cardTitle');
  });

  test('uses sheet-sized headers for ordinary utility sheets', () => {
    const utilitySheets = [
      'FeedbackSheet.tsx',
      'VoiceCallSettingsSheet.tsx',
      'CreateMemorySheet.tsx',
    ].map((file) => read(`src/components/sheets/${file}`));

    for (const source of utilitySheets) {
      expect(source).not.toContain('TYPE.screenTitle');
      expect(source).toContain('TYPE.sectionTitle');
    }
  });

  test('keeps list names and setup steps compact inside sheets', () => {
    const addMember = read('src/components/sheets/AddMemberToGroupSheet.tsx');
    const setupTwoFactor = read('src/components/sheets/SetupTwoFactorSheet.tsx');

    expect(addMember).not.toContain('TYPE.cardTitle');
    expect(setupTwoFactor).not.toContain('TYPE.cardTitle');
  });

  test('renders cancellation explanation as body copy', () => {
    const confirmation = read('src/components/sheets/CancelSubscriptionConfirmationSheet.tsx');
    expect(confirmation).toContain('...TYPE.bodyLarge');
    expect(confirmation).not.toContain('...TYPE.cardTitle');
  });
});
