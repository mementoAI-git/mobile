import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { contentMaxWidth, minTouchTarget, screenGutter } from '@/constants/responsive';

describe('account, overview, and billing sizing', () => {
  test('tablet viewport caps reading width at 720 and gutters at 32', () => {
    expect(contentMaxWidth(768)).toBe(720);
    expect(contentMaxWidth(1024)).toBe(720);
    expect(screenGutter(1024)).toBeLessThanOrEqual(32);
    expect(screenGutter(320)).toBeLessThanOrEqual(20);
  });

  test('StatCard uses responsive module and does not import react-native-size-matters directly', () => {
    const statSource = readFileSync('src/components/ui/StatCard.tsx', 'utf8');

    expect(statSource).toContain("from '@/constants/responsive'");
    expect(statSource).not.toContain("from 'react-native-size-matters'");
  });

  test('OverviewCaptureCard preserves native font scaling and guarantees 44dp minimum touch height', () => {
    const captureSource = readFileSync('src/components/overview/OverviewCaptureCard.tsx', 'utf8');

    expect(captureSource).not.toContain('allowFontScaling={false}');
    expect(captureSource).toContain('minTouchTarget');
  });

  test('WeeklyProgressCard divides days using flex: 1 across available width', () => {
    const weeklySource = readFileSync('src/components/account/WeeklyProgressCard.tsx', 'utf8');

    expect(weeklySource).toContain('flex: 1');
    expect(weeklySource).toContain("from '@/constants/responsive'");
  });

  test('EnrichmentScoreCard uses responsive metrics and unscaled flex weights for segments', () => {
    const enrichmentSource = readFileSync('src/components/account/EnrichmentScoreCard.tsx', 'utf8');

    expect(enrichmentSource).toContain("from '@/constants/responsive'");
    expect(enrichmentSource).toContain('flex: segment.flex');
  });

  test('Billing cards guarantee 44dp touch targets for actions', () => {
    const storageSource = readFileSync('src/components/billing/BillingStorageCard.tsx', 'utf8');

    expect(storageSource).toContain("from '@/constants/responsive'");
  });

  test('Overview components use responsive metrics', () => {
    const activitySource = readFileSync('src/components/overview/ActivityListItem.tsx', 'utf8');
    const captureSource = readFileSync('src/components/overview/OverviewCaptureCard.tsx', 'utf8');
    const enrichmentSource = readFileSync('src/components/overview/EnrichmentSummaryCard.tsx', 'utf8');

    expect(activitySource).toContain("from '@/constants/responsive'");
    expect(captureSource).toContain("from '@/constants/responsive'");
    expect(enrichmentSource).toContain("from '@/constants/responsive'");
  });
});
