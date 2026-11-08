// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  clampEnrichmentScore,
  deriveAccountWeek,
  deriveStreakWeek,
  normalizeEnrichmentDimensions,
} from './account-overview';

describe('account overview derivation', () => {
  test('clamps enrichment to an integer percentage', () => {
    expect(clampEnrichmentScore(-4)).toBe(0);
    expect(clampEnrichmentScore(36.4)).toBe(36);
    expect(clampEnrichmentScore(180)).toBe(100);
    expect(clampEnrichmentScore(undefined)).toBe(0);
  });

  test('builds a Monday-first week and marks streak days through today', () => {
    const week = deriveAccountWeek(new Date('2026-07-22T12:00:00.000Z'), 3);

    expect(week.map((day) => day.label)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(week.map((day) => day.date)).toEqual([20, 21, 22, 23, 24, 25, 26]);
    expect(week.filter((day) => day.isCompleted).map((day) => day.date)).toEqual([20, 21]);
    expect(week.find((day) => day.isToday)?.date).toBe(22);
  });

  test('marks the streak that ends on the last active day, as the web streak card does', () => {
    const today = new Date(2026, 10, 7, 12); // Saturday, November 7
    const week = deriveStreakWeek(today, 3, new Date(2026, 10, 7, 9).toISOString());
    expect(week.map((day) => day.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(week.filter((day) => day.isCompleted).map((day) => day.date)).toEqual([5, 6, 7]);
    expect(week.find((day) => day.isToday)?.fullDate).toBe('November 7');
    // Without a last active day, the streak ends yesterday.
    expect(deriveStreakWeek(today, 2).filter((day) => day.isCompleted).map((day) => day.date)).toEqual([5, 6]);
    expect(deriveStreakWeek(today, 0).some((day) => day.isCompleted)).toBe(false);
  });

  test('normalizes enrichment category scores in the reference display order', () => {
    const dimensions = normalizeEnrichmentDimensions([
      {
        key: 'identity_self',
        label: 'Identity & Self',
        score: 3.45,
        weight: 1,
        itemCount: 1,
        unlocked: true,
      },
      {
        key: 'memories_experiences',
        label: 'Memories & Experiences',
        score: 24,
        weight: 1,
        itemCount: 4,
        unlocked: true,
      },
    ]);

    expect(dimensions).toHaveLength(10);
    expect(dimensions[0]).toMatchObject({
      key: 'memories_experiences',
      label: 'Memories & Experiences',
      score: 24,
    });
    expect(dimensions.at(-1)).toMatchObject({
      key: 'identity_self',
      score: 3.45,
    });
    expect(dimensions.find((item) => item.key === 'heritage_roots')?.score).toBe(0);
  });
});
