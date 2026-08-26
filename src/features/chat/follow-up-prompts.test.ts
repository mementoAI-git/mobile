// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { getFollowUpPrompts, CATEGORY_FOLLOW_UPS, DEFAULT_FOLLOW_UPS } from './follow-up-prompts';

describe('follow-up prompts generator', () => {
  test('returns 3 follow-ups matching the given category', () => {
    const familyFollowUps = getFollowUpPrompts('family', 'A childhood memory');
    expect(familyFollowUps.length).toBe(3);
    expect(CATEGORY_FOLLOW_UPS.family).toContain(familyFollowUps[0]);
  });

  test('falls back to default follow-ups for unknown category', () => {
    const defaultFollowUps = getFollowUpPrompts('unknown-cat', 'Some title');
    expect(defaultFollowUps.length).toBe(3);
    expect(DEFAULT_FOLLOW_UPS).toContain(defaultFollowUps[0]);
  });

  test('rotates questions on subsequent conversation turns', () => {
    const turn0 = getFollowUpPrompts('career', 'First job', 0);
    const turn1 = getFollowUpPrompts('career', 'First job', 1);

    expect(turn0).not.toEqual(turn1);
    expect(turn0.length).toBe(3);
    expect(turn1.length).toBe(3);
  });
});
