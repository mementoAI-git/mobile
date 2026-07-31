// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';

const typographyUrl = new URL(
  '../../components/settings/settings-typography.ts',
  import.meta.url,
);

describe('Settings typography', () => {
  test('defines the shared editorial hierarchy', () => {
    expect(existsSync(typographyUrl)).toBe(true);

    const typography = readFileSync(typographyUrl, 'utf8');
    expect(typography).toContain('screenTitle');
    expect(typography).toContain('fontFamily: FONTS.serif');
    expect(typography).toContain('identityTitle');
    expect(typography).toContain('fontFamily: FONTS.serifMedium');
    expect(typography).toContain('rowLabel');
    expect(typography).toContain('fontFamily: FONTS.sansMedium');
    expect(typography).toContain('buttonLabel');
    expect(typography).toContain('fontFamily: FONTS.sansSemi');
  });

  test('applies the hierarchy throughout Settings', () => {
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
      expect(source).toContain('SETTINGS_TYPE');
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
      expect(source).toContain('SETTINGS_TYPE');
    }
  });
});
