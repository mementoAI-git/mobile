// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { calculateMilestones } from './milestone-celebrations';

describe('milestone celebration helpers', () => {
  test('correctly evaluates unlocked and locked milestones from stats', () => {
    const milestones = calculateMilestones({
      memoryCount: 1,
      streakDays: 3,
      capsuleCount: 0,
      beneficiaryCount: 1,
    });

    const firstStory = milestones.find((m) => m.id === 'first-story');
    expect(firstStory?.achieved).toBe(true);
    expect(firstStory?.progressLabel).toBe('Unlocked');

    const fiveStories = milestones.find((m) => m.id === 'story-five');
    expect(fiveStories?.achieved).toBe(false);
    expect(fiveStories?.progressLabel).toBe('1 / 5');

    const habit = milestones.find((m) => m.id === 'streak-seven');
    expect(habit?.achieved).toBe(false);
    expect(habit?.progressLabel).toBe('3 / 7 days');

    const contact = milestones.find((m) => m.id === 'legacy-contact');
    expect(contact?.achieved).toBe(true);
    expect(contact?.progressLabel).toBe('Unlocked');
  });

  test('handles empty stats gracefully', () => {
    const milestones = calculateMilestones({});
    expect(milestones.every((m) => !m.achieved)).toBe(true);
  });
});
