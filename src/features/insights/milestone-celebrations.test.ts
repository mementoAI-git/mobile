// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { calculateMilestones, orderMilestones } from './milestone-celebrations';

describe('milestone celebration helpers', () => {
  test('measures each milestone against its own figure', () => {
    const milestones = calculateMilestones({ memoryCount: 4, reflectionCount: 1, streakDays: 3, enrichmentScore: 72, beneficiaryCount: 0 });
    const byId = Object.fromEntries(milestones.map((m) => [m.id, m]));
    expect(byId['first-story'].progressLabel).toBe('Unlocked');
    expect(byId['stories-ten'].progressLabel).toBe('4 / 10 stories');
    expect(byId['stories-ten'].progress).toBeCloseTo(0.4);
    expect(byId['first-reflection'].achieved).toBe(true);
    expect(byId['streak-seven'].progressLabel).toBe('3 / 7 days');
    expect(byId['enrichment-strong'].achieved).toBe(true);
    // One-step goals have nothing to count.
    expect(byId['legacy-contact'].progressLabel).toBe('Not yet');
    expect(byId['legacy-contact'].progress).toBeUndefined();
  });

  test('handles empty stats gracefully', () => {
    const milestones = calculateMilestones({});
    expect(milestones.every((m) => !m.achieved)).toBe(true);
  });

  test('orders what is next first: closest unreached, then reached', () => {
    const ordered = orderMilestones(calculateMilestones({ onboardingComplete: true, memoryCount: 8, streakDays: 1, beneficiaryCount: 1 })).map((m) => m.id);
    expect(ordered[0]).toBe('stories-ten');
    expect(ordered.indexOf('legacy-contact')).toBeGreaterThan(ordered.indexOf('first-reflection'));
  });
});

describe('Complete onboarding milestone', () => {
  const onboarding = (complete: boolean) =>
    calculateMilestones({ onboardingComplete: complete }).find((m) => m.id === 'onboarding')!;

  test('opens onboarding until it is finished', () => {
    expect(onboarding(false)).toMatchObject({ achieved: false, progressLabel: 'Start', href: '/(onboard)' });
  });

  test('unlocks and stops linking once onboarding is completed', () => {
    expect(onboarding(true)).toMatchObject({ achieved: true, progressLabel: 'Unlocked' });
    expect(onboarding(true).href).toBeUndefined();
  });

  test('leads the list while unfinished, ahead of goals already in progress', () => {
    const ordered = orderMilestones(calculateMilestones({ memoryCount: 8 })).map((m) => m.id);
    expect(ordered.slice(0, 2)).toEqual(['onboarding', 'stories-ten']);
  });
});

describe('milestone presentation', () => {
  test('Future Messenger is hidden while time capsules are paused, with no Coming soon label', () => {
    const milestones = calculateMilestones({ capsuleCount: 3 });
    expect(milestones.find((m) => m.id === 'time-capsule')).toBeUndefined();
    expect(milestones.some((m) => m.progressLabel === 'Coming soon')).toBe(false);
  });

  test('ticks are brand orange and the score shows the enrichment card level', async () => {
    const panel = await Bun.file(new URL('../../components/insights/MilestonesPanel.tsx', import.meta.url)).text();
    const stats = await Bun.file(new URL('../../components/insights/MemoryStatistics.tsx', import.meta.url)).text();
    expect(panel).toContain('<Check size={16} color={colors.brand}');
    // Like the other tabs: the cards follow the tab row with no heading or count.
    expect(panel).not.toContain('accessibilityRole="header"');
    expect(panel).not.toContain(' reached\n');
    expect(panel).not.toContain('>\n          Milestones\n');
    expect(stats).toContain("from '@/features/overview/enrichment-strength'");
    // Every stat tile uses TYPE.stat at full size; nothing shrinks to fit.
    expect(stats).not.toContain('adjustsFontSizeToFit');
    expect(stats).toContain('TYPE.insightStat');
  });
});
