import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('sheet typography roles', () => {
  test('keeps billing form values and payment choices out of editorial title and large body roles', () => {
    const editBilling = read('src/components/sheets/EditBillingDetailsSheet.tsx');
    const addPayment = read('src/components/sheets/AddPaymentMethodSheet.tsx');

    expect(editBilling).not.toContain('TYPE.cardTitle');
    expect(editBilling).toContain('...TYPE.input');
    expect(addPayment).not.toContain('TYPE.cardTitle');
    expect(addPayment).not.toContain('TYPE.bodyLarge');
    expect(addPayment).toContain('...TYPE.label');
  });

  test('uses sheet-sized headers for ordinary utility and confirmation sheets', () => {
    const utilitySheets = [
      'FeedbackSheet.tsx',
      'VoiceCallSettingsSheet.tsx',
      'CreateMemorySheet.tsx',
      'CancelSubscriptionConfirmationSheet.tsx',
      'EndVoiceSessionSheet.tsx',
    ].map((file) => read(`src/components/sheets/${file}`));

    for (const source of utilitySheets) {
      expect(source).not.toContain('TYPE.screenTitle');
      expect(source).toContain('TYPE.sectionTitle');
    }

    const capsuleSheet = read('src/components/sheets/CreateCapsuleSheet.tsx');
    expect(capsuleSheet).not.toContain('style={TYPE.bodyLarge}>Delivery Date');
    expect(capsuleSheet).toContain('style={TYPE.sectionTitle}>Delivery Date');
  });

  test('keeps list names and setup steps compact inside sheets', () => {
    const addMember = read('src/components/sheets/AddMemberToGroupSheet.tsx');
    const setupTwoFactor = read('src/components/sheets/SetupTwoFactorSheet.tsx');

    expect(addMember).not.toContain('TYPE.cardTitle');
    expect(addMember).not.toContain('TYPE.bodyLarge');
    expect(addMember).toContain('...TYPE.body');

    expect(setupTwoFactor).not.toContain('TYPE.cardTitle');
    expect(setupTwoFactor).not.toContain('TYPE.bodyLarge');
    expect(setupTwoFactor).toContain('style={TYPE.label}>Step 1');
  });

  test('renders cancellation explanation as standard body copy', () => {
    const confirmation = read('src/components/sheets/CancelSubscriptionConfirmationSheet.tsx');
    expect(confirmation).toContain('...TYPE.body,');
    expect(confirmation).not.toContain('...TYPE.bodyLarge');
    expect(confirmation).not.toContain('...TYPE.cardTitle');
  });

  test('keeps editable inputs on TYPE.input role without shrinking', () => {
    const addBeneficiary = read('src/components/sheets/AddBeneficiarySheet.tsx');
    const createGroup = read('src/components/sheets/CreateGroupSheet.tsx');
    const createCapsule = read('src/components/sheets/CreateCapsuleSheet.tsx');

    expect(addBeneficiary).toContain('...TYPE.input');
    expect(addBeneficiary).not.toContain('...TYPE.bodyLarge');
    expect(createGroup).toContain('...TYPE.input');
    expect(createGroup).not.toContain('...TYPE.bodyLarge');
    expect(createCapsule).toContain('style={TYPE.input}');
    expect(createCapsule).not.toContain('style={TYPE.bodyLarge}');
  });

  test('keeps action buttons on TYPE.button role', () => {
    const memoryActions = read('src/components/sheets/MemoryActionsSheet.tsx');
    expect(memoryActions).not.toContain('...TYPE.bodyLarge, color: COLORS.textStrong');
    expect(memoryActions).not.toContain('...TYPE.bodyLarge, color: COLORS.textInverse');
    expect(memoryActions).not.toContain('...TYPE.bodyLarge, color: COLORS.error');
    expect(memoryActions).toContain('...TYPE.button, color: COLORS.textStrong');
  });
});
