// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('My Insights screen', () => {
  test('registers a full screen route backed by existing profile and persona data', async () => {
    const root = await Bun.file(new URL('../../../app/_layout.tsx', import.meta.url)).text();
    const screen = await Bun.file(new URL('../../../app/insights.tsx', import.meta.url)).text();
    const content = await Bun.file(
      new URL('../../components/account/InsightsContentCard.tsx', import.meta.url),
    ).text();

    expect(root).toContain('<Stack.Screen name="insights"');
    expect(screen).toContain('useProfile()');
    expect(screen).toContain('useUserStats()');
    expect(screen).toContain('usePersona()');
    expect(screen).toContain('useUserContext()');
    expect(screen).toContain("router.push('/settings')");
    expect(screen).toContain("router.replace('/account')");
    expect(screen).toContain('Enrichment score');
    expect(screen).toContain('Preferences');
    expect(content).toContain('normalizeEnrichmentDimensions');
    expect(`${screen}${content}`).not.toMatch(/text-gray-|text-slate-/);
  });
});
