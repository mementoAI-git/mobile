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
    // Account starts with the profile card; plan, About me and Edit Profile live elsewhere.
    expect(account).not.toContain("openSheet('edit-profile')");
    expect(account).not.toContain('AboutMeCard');
    const order = ['<Avatar', 'View insights', '<MusicControllerCard', '<WeeklyProgressCard', '<EnrichmentScoreCard'].map((s) => account.indexOf(s));
    expect(order.every((index) => index > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(account).toContain('borderRadius: 20');
    expect(account).toContain("<EnrichmentScoreCard score={score} onPress={openEnrichment} />");
    expect(account).toContain("params: { section: 'enrichment' }");
    expect(account).toContain("router.replace('/(tabs)/overview')");
    expect(account).toContain("openSheet('streak')");
    expect(header).toContain("openSheet('quick-tools')");
    expect(header).not.toContain("router.push('/settings/profile')");
    expect(settingsIndex).toContain("push('/settings/profile')");
  });
});
