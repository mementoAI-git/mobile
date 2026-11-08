// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Settings typography', () => {
  test('keeps navigation rows and plain billing data on compact body roles', () => {
    const hubRow = readFileSync(
      new URL('../../components/settings/SettingsHubRow.tsx', import.meta.url),
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

    expect(hubRow).toContain('style={[TYPE.body, { flex: 1, color: COLORS.textStrong }]}');
    expect(profile).toContain('TYPE.body');
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
      '../../components/beneficiaries/PersonCard.tsx',
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
      expect(source.includes("@/constants/typography") || source.includes('<SheetHeader')).toBe(true);
      if (!source.includes('<SheetHeader')) expect(source).toMatch(/TYPE\.(?:uiTitle|sectionTitle|cardTitle|label|body|bodySmall)/);
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
    expect(groupDetail).toContain('...TYPE.profileName, color: GROUP_ON_COLOR');
    expect(groupDetail).toContain('<PersonCard');
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

    expect(insights).toContain('TYPE.screenTitle');
    expect(insights).not.toContain('...TYPE.sectionTitle,\n    lineHeight: 28,\n  },\n  biography:');
  });

  test('beneficiary list rows and screen layout use semantic typography and single header', () => {
    const personRow = readFileSync(
      new URL('../../components/beneficiaries/PersonCard.tsx', import.meta.url),
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
    expect(personRow).toContain('...TYPE.profileName, color: COLORS.textStrong');
    expect(personRow).toContain('...TYPE.bodySmall, color: COLORS.textWeak');

    expect(groupRow).not.toContain('style={TYPE.cardTitle}');
    expect(groupRow).toContain('...TYPE.profileName, color: COLORS.textStrong');

    expect(beneficiariesScreen).toContain('<SettingsSubpageHeader title="People &" accent="groups"');
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

    expect(storageCard).toContain('rounded-[24px]');
    expect(storageCard).not.toContain('border border-stroke-weaker');
    expect(tabs).toContain('rounded-full');
    expect(tabs).not.toContain('border border-stroke-weaker');
    expect(banner).not.toContain('COLORS.info, COLORS.blue6');
  });

  test('feedback settings screen mirrors the web feedback page', () => {
    const feedbackScreen = readFileSync(
      new URL('../../../app/settings/feedback.tsx', import.meta.url),
      'utf8',
    );

    expect(feedbackScreen).toContain('<SettingsSubpageHeader title="Send" accent="feedback"');
    expect(feedbackScreen).toContain('Share a bug, an idea, or something we could improve.');
    expect(feedbackScreen).toContain('label="Message"');
    expect(feedbackScreen).toContain('Add screenshots');
    expect(feedbackScreen).toContain('border border-stroke-weak bg-fill-weak');
    expect(feedbackScreen).toContain('variant="filled"');
    expect(feedbackScreen).not.toContain('Cancel');
    expect(feedbackScreen).not.toContain('bg-settings-card');
    expect(feedbackScreen).not.toContain('OPTIONAL');
    expect(feedbackScreen).toContain('COLORS.textStrong');
    expect(feedbackScreen).toContain('COLORS.textWeak');
  });
});

describe('settings subpage background', () => {
  test('every settings page sits on the same plain page background as the hub, with no texture overlay', () => {
    const { readdirSync, readFileSync, statSync } = require('node:fs');
    const { join } = require('node:path');
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((name: string) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : path.endsWith('.tsx') ? [path] : [];
    });
    for (const file of walk('app/settings')) {
      const source = readFileSync(file, 'utf8');
      expect({ file, overlay: /source=\{PATTERN\}/.test(source) }).toEqual({ file, overlay: false });
    }
  });
});

describe('People & groups layout', () => {
  test('matches Security: full-width header, then the page column with the tabs as the list section header', () => {
    const { readFileSync } = require('node:fs');
    const security = readFileSync('app/settings/account.tsx', 'utf8');
    const people = readFileSync('app/settings/beneficiaries.tsx', 'utf8');
    const group = readFileSync('app/settings/group/[id].tsx', 'utf8');
    for (const source of [security, people, group]) {
      expect(source.indexOf('<SettingsSubpageHeader')).toBeLessThan(source.indexOf('<ResponsiveScreen'));
    }
    expect(security).toContain('content: { paddingTop: 16, paddingBottom: 48 }');
    expect(people).toContain('content: { paddingTop: 16, paddingBottom: 48 }');
    expect(people).toContain('toolbar: {\n    marginBottom: 24,');
    expect(people.indexOf('styles.toolbar')).toBeGreaterThan(people.indexOf('<ScrollView'));
  });
});
