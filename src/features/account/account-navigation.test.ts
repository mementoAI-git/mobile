// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('account overview navigation', () => {
  test('registers account and preserves settings as the gear destination', async () => {
    const root = await Bun.file(new URL('../../../app/_layout.tsx', import.meta.url)).text();
    const account = await Bun.file(new URL('../../../app/account.tsx', import.meta.url)).text();
    const header = await Bun.file(
      new URL('../../components/ui/DashboardHeader.tsx', import.meta.url),
    ).text();
    const settingsIndex = await Bun.file(
      new URL('../../../app/settings/index.tsx', import.meta.url),
    ).text();

    expect(root).toContain('name="account"');
    expect(account).toContain("router.push('/settings')");
    expect(account).toContain("router.push('/insights')");
    expect(account).toContain("openSheet('edit-profile')");
    expect(account).toContain("router.replace('/(tabs)/overview')");
    expect(account).toContain("openSheet('streak')");
    expect(header).toContain("router.push('/account')");
    expect(header).not.toContain("router.push('/settings/profile')");
    expect(settingsIndex).toContain("push('/settings/profile')");
  });
});
