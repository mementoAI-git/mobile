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
    expect(settings).toContain('JOIN OUR COMMUNITY');
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
