// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Settings typography', () => {
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
