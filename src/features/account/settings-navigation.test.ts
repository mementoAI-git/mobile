// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('settings and personal info navigation', () => {
  test('keeps every existing settings destination in the redesigned hub', async () => {
    const settings = await Bun.file(
      new URL('../../../app/settings/index.tsx', import.meta.url),
    ).text();

    expect(settings).not.toContain('<Redirect');
    expect(settings).toContain("'/settings/profile'");
    expect(settings).toContain("'/settings/account'");
    expect(settings).toContain("'/settings/privacy'");
    expect(settings).toContain("'/settings/beneficiaries'");
    expect(settings).toContain("'/settings/billing'");
    expect(settings).toContain("push('/settings/feedback')");
    expect(settings).toContain('handleLogout');
    // No placeholder social links: there are no real community profiles yet (App Review 2.1).
    expect(settings).not.toContain('JOIN OUR COMMUNITY');
    expect(settings).not.toContain('https://x.com');
  });

  test('hub labels match web; Milestones is the milestone list only', async () => {
    const settings = await Bun.file(new URL('../../../app/settings/index.tsx', import.meta.url)).text();
    const account = await Bun.file(new URL('../../../app/account.tsx', import.meta.url)).text();
    const milestones = await Bun.file(new URL('../../components/insights/MilestonesPanel.tsx', import.meta.url)).text();
    const labels = ['Personal info', 'Security', 'People & Groups', 'Privacy & Account', 'Billing', 'Send Feedback']
      .map((label) => settings.indexOf(`label="${label}"`));
    expect(labels.every((index) => index > -1)).toBe(true);
    expect([...labels].sort((a, b) => a - b)).toEqual(labels);
    expect(settings).toContain("'Logout'");
    expect(settings).not.toContain('Daily reflection ritual');
    expect(settings).not.toContain('Ceremonial Experience Lab');
    expect(account).not.toContain('Daily reflection ritual');
    expect(account).not.toContain('Ceremonial Experience Lab');
    // No ritual row, streak card or ceremony lab: the celebration sheets open in context.
    expect(milestones).not.toContain('Daily reflection ritual');
    expect(milestones).not.toContain('Ceremonial Experience Lab');
    expect(milestones).not.toContain('Current streak');
  });

  test('personal info opens the shared edit profile sheet', async () => {
    const profile = await Bun.file(
      new URL('../../../app/settings/profile.tsx', import.meta.url),
    ).text();

    expect(profile).toContain('Personal information');
    expect(profile).toContain('About me');
    expect(profile).toContain("openSheet('edit-profile')");
    expect(profile).toContain("router.replace('/settings')");
    expect(profile).toContain('Display name (Nickname)');
    expect(profile).toContain('City/Location');
  });
});
