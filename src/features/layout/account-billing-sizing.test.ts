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

  test('MemoryPromptCard preserves native font scaling and guarantees 44dp minimum touch height', () => {
    const promptSource = readFileSync('src/components/overview/MemoryPromptCard.tsx', 'utf8');

    expect(promptSource).not.toContain('allowFontScaling={false}');
    expect(promptSource).toContain('minTouchTarget');
  });

  test('WeeklyProgressCard divides days using flex: 1 across available width', () => {
    const weeklySource = readFileSync('src/components/account/WeeklyProgressCard.tsx', 'utf8');

    expect(weeklySource).toContain('flex: 1');
    expect(weeklySource).toContain("from '@/constants/responsive'");
  });

  test('EnrichmentScoreCard and InsightsContentCard use responsive metrics and unscaled flex weights for segments', () => {
    const enrichmentSource = readFileSync('src/components/account/EnrichmentScoreCard.tsx', 'utf8');
    const insightsSource = readFileSync('src/components/account/InsightsContentCard.tsx', 'utf8');

    expect(enrichmentSource).toContain("from '@/constants/responsive'");
    expect(enrichmentSource).toContain('flex: segment.flex');
    expect(insightsSource).toContain("from '@/constants/responsive'");
  });

  test('Billing cards guarantee 44dp touch targets for actions', () => {
    const detailsSource = readFileSync('src/components/billing/BillingDetailsSection.tsx', 'utf8');
    const methodsSource = readFileSync('src/components/billing/BillingPaymentMethodsSection.tsx', 'utf8');
    const storageSource = readFileSync('src/components/billing/BillingStorageCard.tsx', 'utf8');

    expect(detailsSource).toContain('minTouchTarget');
    expect(methodsSource).toContain('minTouchTarget');
    expect(storageSource).toContain("from '@/constants/responsive'");
  });

  test('Overview components use responsive metrics', () => {
    const activitySource = readFileSync('src/components/overview/ActivityListItem.tsx', 'utf8');
    const spotlightSource = readFileSync('src/components/overview/MemorySpotlightCard.tsx', 'utf8');

    expect(activitySource).toContain("from '@/constants/responsive'");
    expect(spotlightSource).toContain("from '@/constants/responsive'");
  });
});
