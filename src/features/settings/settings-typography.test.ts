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
    const tabs = readFileSync(
      new URL('../../components/billing/BillingTabs.tsx', import.meta.url),
      'utf8',
    );
    const profile = readFileSync(
      new URL('../../../app/settings/profile.tsx', import.meta.url),
      'utf8',
    );

    expect(hubRow).toContain('style={[TYPE.body, { flex: 1 }]}');
    expect(profile).toContain('TYPE.body');
    expect(billingDetails).not.toContain('TYPE.sectionTitle');
    expect(billingDetails).toContain('Billing details');
    expect(billingDetails).toContain('Billing email');
    expect(paymentMethods).not.toContain('TYPE.sectionTitle');
    expect(paymentMethods).toContain('Payment methods');
    expect(paymentMethods).not.toContain('className="h-12 px-4"');
    expect(tabs).not.toContain('h-8');
    expect(tabs).not.toContain('rounded-lg');
    expect(invoices.match(/TYPE\.cardTitle/g)).toHaveLength(1);
    expect(invoices).not.toContain('TYPE.bodyLarge');
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
      '../../components/settings/SettingsSubpageHeader.tsx',
    ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

    for (const source of settingsSources) {
      const usesSharedHeader = source.includes('SettingsSubpageHeader');
      expect(
        source.includes("@/constants/typography") || usesSharedHeader,
      ).toBe(true);
      expect(
        /TYPE\.(?:screenTitle|sectionTitle|cardTitle|label|body|bodySmall)/.test(source) || usesSharedHeader,
      ).toBe(true);
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

  test('normalizes Manage Plan and Cancel Plan typography', () => {
    const pricing = readFileSync(
      new URL('../../../app/pricing.tsx', import.meta.url),
      'utf8',
    );
    const cancelPlan = readFileSync(
      new URL('../../../app/settings/cancel-plan.tsx', import.meta.url),
      'utf8',
    );

    expect(pricing).not.toContain('TYPE.bodyLarge');
    expect(cancelPlan).not.toContain('TYPE.bodyLarge');
    expect(pricing).toContain('...TYPE.body');
    expect(cancelPlan).toContain('style={TYPE.body}>Your feedback helps us make Memento AI better');
  });

  test('normalizes form values and member lists in Settings subpages', () => {
    const beneficiaryDetail = readFileSync(
      new URL('../../../app/settings/beneficiary/[id].tsx', import.meta.url),
      'utf8',
    );
    const groupDetail = readFileSync(
      new URL('../../../app/settings/group/[id].tsx', import.meta.url),
      'utf8',
    );

    expect(beneficiaryDetail).not.toContain('fieldValueText: {\n    ...TYPE.bodyLarge');
    expect(beneficiaryDetail).toContain('fieldValueText: {\n    ...TYPE.body');

    expect(groupDetail).not.toContain('...TYPE.bodyLarge, color: COLORS.textInverse');
    expect(groupDetail).not.toContain('...TYPE.bodyLarge, color: COLORS.textStrong, marginTop: 32');
    expect(groupDetail).not.toContain('...TYPE.cardTitle, color: COLORS.textStrong }} numberOfLines={1}');
    expect(groupDetail).toContain('...TYPE.body, color: COLORS.textStrong }} numberOfLines={1}');
  });

  test('uses screenTitle for top-level screen headers', () => {
    const account = readFileSync(
      new URL('../../../app/account.tsx', import.meta.url),
      'utf8',
    );
    const insights = readFileSync(
      new URL('../../../app/insights.tsx', import.meta.url),
      'utf8',
    );

    expect(account).toContain('...TYPE.screenTitle');
    expect(account).not.toContain('...TYPE.sectionTitle,\n              lineHeight: 28,\n            }}\n          >\n            Account');

    expect(insights).toContain('...TYPE.screenTitle');
    expect(insights).not.toContain('...TYPE.sectionTitle,\n    lineHeight: 28,\n  },\n  biography:');
  });

  test('beneficiary list rows and screen layout use semantic typography and single header', () => {
    const personRow = readFileSync(
      new URL('../../components/beneficiaries/BeneficiaryPersonRow.tsx', import.meta.url),
      'utf8',
    );
    const groupRow = readFileSync(
      new URL('../../components/beneficiaries/BeneficiaryGroupRow.tsx', import.meta.url),
      'utf8',
    );
    const beneficiariesScreen = readFileSync(
      new URL('../../../app/settings/beneficiaries.tsx', import.meta.url),
      'utf8',
    );

    expect(personRow).not.toContain('style={TYPE.cardTitle}');
    expect(personRow).toContain('...TYPE.body, color: COLORS.textStrong');
    expect(personRow).toContain('...TYPE.bodySmall, color: COLORS.textWeak');

    expect(groupRow).not.toContain('style={TYPE.cardTitle}');
    expect(groupRow).toContain('...TYPE.body, color: COLORS.textStrong');

    expect(beneficiariesScreen).toContain('<SettingsSubpageHeader title="Beneficiaries"');
    expect(beneficiariesScreen).not.toContain('Beneficiaries and groups');
  });

  test('security settings screen and credential rows use semantic tokens and shared header', () => {
    const securityScreen = readFileSync(
      new URL('../../../app/settings/account.tsx', import.meta.url),
      'utf8',
    );
    const credentialRow = readFileSync(
      new URL('../../components/security/SecurityCredentialRow.tsx', import.meta.url),
      'utf8',
    );

    expect(securityScreen).toContain('<SettingsSubpageHeader title="Security"');
    expect(securityScreen).not.toContain('TYPE.sectionTitle');
    expect(securityScreen).not.toContain('TYPE.cardTitle');
    expect(securityScreen).not.toMatch(/borderRadius:\s*9\b/);
    expect(securityScreen).toContain('borderRadius: 999');
    expect(securityScreen).not.toContain('borderColor: COLORS.strokeWeaker');

    expect(credentialRow).toContain('...TYPE.body, color: COLORS.textStrong');
    expect(credentialRow).toContain('...TYPE.bodySmall, color: COLORS.textWeak');
    expect(credentialRow).not.toContain('style={TYPE.label}');
    expect(credentialRow).not.toContain('borderColor: COLORS.strokeWeaker');
  });

  test('personal information screen uses semantic tokens and shared header', () => {
    const profileScreen = readFileSync(
      new URL('../../../app/settings/profile.tsx', import.meta.url),
      'utf8',
    );

    expect(profileScreen).toContain('<SettingsSubpageHeader title="Personal information"');
    expect(profileScreen).not.toContain('TYPE.sectionTitle');
    expect(profileScreen).not.toContain('TYPE.cardTitle');
    expect(profileScreen).not.toContain('borderColor: COLORS.strokeWeaker');
    expect(profileScreen).toContain('COLORS.textStrong');
    expect(profileScreen).toContain('COLORS.textWeak');
    expect(profileScreen).toContain('COLORS.textMuted');
  });

  test('privacy screen uses semantic tokens and shared header', () => {
    const privacyScreen = readFileSync(
      new URL('../../../app/settings/privacy.tsx', import.meta.url),
      'utf8',
    );

    expect(privacyScreen).toContain('<SettingsSubpageHeader title="Privacy"');
    expect(privacyScreen).not.toContain('TYPE.sectionTitle');
    expect(privacyScreen).not.toContain('TYPE.cardTitle');
    expect(privacyScreen).not.toContain('text-text-strong');
    expect(privacyScreen).not.toContain('border border-stroke-weaker');
    expect(privacyScreen).toContain('COLORS.textStrong');
    expect(privacyScreen).toContain('COLORS.textWeak');
  });

  test('billing overview cards and tabs use journal cards and semantic tokens', () => {
    const billingDetails = readFileSync(
      new URL('../../components/billing/BillingDetailsSection.tsx', import.meta.url),
      'utf8',
    );
    const paymentMethods = readFileSync(
      new URL('../../components/billing/BillingPaymentMethodsSection.tsx', import.meta.url),
      'utf8',
    );
    const storageCard = readFileSync(
      new URL('../../components/billing/BillingStorageCard.tsx', import.meta.url),
      'utf8',
    );
    const tabs = readFileSync(
      new URL('../../components/billing/BillingTabs.tsx', import.meta.url),
      'utf8',
    );
    const banner = readFileSync(
      new URL('../../components/subscription/PlanSummaryBanner.tsx', import.meta.url),
      'utf8',
    );

    expect(billingDetails).toContain('rounded-[24px]');
    expect(billingDetails).not.toContain('border border-stroke-weaker');
    expect(billingDetails).not.toContain('border-t border-stroke-weak');
    expect(paymentMethods).toContain('rounded-[24px]');
    expect(paymentMethods).not.toContain('border border-stroke-weaker');
    expect(paymentMethods).not.toContain('border-t border-stroke-weak');
    expect(storageCard).toContain('rounded-[24px]');
    expect(storageCard).not.toContain('border border-stroke-weaker');
    expect(tabs).toContain('rounded-full');
    expect(tabs).not.toContain('border border-stroke-weaker');
    expect(banner).not.toContain('COLORS.info, COLORS.blue6');
  });

  test('feedback settings screen uses journal cards and shared subpage header', () => {
    const feedbackScreen = readFileSync(
      new URL('../../../app/settings/feedback.tsx', import.meta.url),
      'utf8',
    );

    expect(feedbackScreen).toContain('<SettingsSubpageHeader title="Send feedback"');
    expect(feedbackScreen).not.toContain('h-[88px]');
    expect(feedbackScreen).toContain('rounded-[24px]');
    expect(feedbackScreen).not.toContain('border border-stroke-weaker');
    expect(feedbackScreen).not.toContain('border-t border-stroke-weaker');
    expect(feedbackScreen).toContain('className="h-14 rounded-full"');
    expect(feedbackScreen).not.toContain('rounded-2xl bg-card');
    expect(feedbackScreen).toContain('COLORS.textStrong');
    expect(feedbackScreen).toContain('COLORS.textWeak');
    expect(feedbackScreen).toContain('COLORS.textMuted');
  });
});
