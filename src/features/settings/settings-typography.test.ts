// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Settings typography', () => {
  test('keeps navigation rows and plain billing data on compact body roles', () => {
    const hubRow = readFileSync(
      new URL('../../components/settings/SettingsHubRow.tsx', import.meta.url),
      'utf8',
    );
    const billingDetails = readFileSync(
      new URL('../../components/billing/BillingDetailsSection.tsx', import.meta.url),
      'utf8',
    );
    const paymentMethods = readFileSync(
      new URL('../../components/billing/BillingPaymentMethodsSection.tsx', import.meta.url),
      'utf8',
    );
    const invoices = readFileSync(
      new URL('../../components/billing/BillingInvoicesPanel.tsx', import.meta.url),
      'utf8',
    );
    const profile = readFileSync(
      new URL('../../../app/settings/profile.tsx', import.meta.url),
      'utf8',
    );

    expect(hubRow).toContain('style={[TYPE.body, { flex: 1 }]}');
    expect(profile).toContain('<Text style={TYPE.body}>{getValue(detail.key)}</Text>');
    expect(billingDetails).not.toContain('TYPE.cardTitle');
    expect(paymentMethods).not.toContain('TYPE.cardTitle');
    expect(invoices.match(/TYPE\.cardTitle/g)).toHaveLength(1);
    expect(invoices).not.toContain('TYPE.sectionTitle');
  });

  test('applies the global hierarchy throughout Settings', () => {
    const settingsSources = [
      '../../../app/settings/index.tsx',
      '../../../app/settings/profile.tsx',
      '../../../app/settings/account.tsx',
      '../../../app/settings/two-factor.tsx',
      '../../../app/settings/privacy.tsx',
      '../../../app/settings/beneficiaries.tsx',
      '../../../app/settings/billing.tsx',
      '../../../app/settings/feedback.tsx',
      '../../../app/settings/activities.tsx',
      '../../components/settings/SettingsHubRow.tsx',
      '../../components/security/SecurityCredentialRow.tsx',
      '../../components/beneficiaries/BeneficiaryPersonRow.tsx',
      '../../components/beneficiaries/BeneficiaryGroupRow.tsx',
      '../../components/beneficiaries/BeneficiaryEmptyState.tsx',
    ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

    for (const source of settingsSources) {
      expect(source).toContain("@/constants/typography");
      expect(source).toMatch(/TYPE\.(?:screenTitle|sectionTitle|cardTitle|label|body|bodySmall)/);
      expect(source).not.toContain('settings-typography');
      expect(source).not.toContain('SETTINGS_TYPE');
    }
  });

  test('applies the hierarchy to Settings sheets', () => {
    const settingsSheets = [
      '../../components/sheets/EditProfileSheet.tsx',
      '../../components/sheets/ChangePasswordSheet.tsx',
      '../../components/sheets/SetupTwoFactorSheet.tsx',
      '../../components/sheets/SecurityConfirmationSheet.tsx',
      '../../components/sheets/BeneficiaryActionsSheet.tsx',
    ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

    for (const source of settingsSheets) {
      expect(source).toContain("@/constants/typography");
      expect(source).toMatch(/TYPE\.(?:uiTitle|sectionTitle|cardTitle|label|body|bodySmall)/);
      expect(source).not.toContain('settings-typography');
      expect(source).not.toContain('SETTINGS_TYPE');
    }
  });
});
