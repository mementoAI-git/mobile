// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('account overview components', () => {
  test('reuse shared UI and semantic design tokens', async () => {
    const banner = await Bun.file(
      new URL('../../components/account/AccountUpgradeBanner.tsx', import.meta.url),
    ).text();
    const score = await Bun.file(
      new URL('../../components/account/EnrichmentScoreCard.tsx', import.meta.url),
    ).text();
    const weekly = await Bun.file(
      new URL('../../components/account/WeeklyProgressCard.tsx', import.meta.url),
    ).text();

    expect(banner).toContain("from '@/constants/tokens'");
    expect(banner).toContain('LinearGradient');
    expect(banner).toContain('isProOrAbove');
    expect(score).toContain('clampEnrichmentScore');
    expect(score).toContain('accessibilityRole="progressbar"');
    expect(weekly).toContain('AccountWeekDay');
    expect(weekly).toContain('React.memo');
    expect(`${banner}${score}${weekly}`).not.toMatch(/text-gray-|text-slate-/);
  });
});
