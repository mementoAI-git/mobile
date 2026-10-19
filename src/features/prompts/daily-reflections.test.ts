import { describe, expect, test } from 'bun:test';
import { canShuffleReflections, reflectionCapture, rotateReflections } from './daily-reflections';
import { getPromptReplyCounts } from './prompt-reply-count';
import { avatarsForCard, shuffleAvatarOrder, refreshAvatarOrder } from './reflection-avatar-order';
import type { IDashboardPromptSlot } from '@/types';

const ai: IDashboardPromptSlot = {
  slot_kind: 'ai', ai_prompt_text: 'What brings you joy?',
  reflection_day_key: '2026-10-18', answered: false,
};
const catalog = (id: string, count = 0): IDashboardPromptSlot => ({
  slot_kind: 'static', prompt: { _id: id, title: `Reflect on ${id}` } as IDashboardPromptSlot['prompt'] & {},
  reflection_day_key: '2026-10-18', answered: false, reply_user_count: count,
});
const usage = { used: 0, remaining: 2, resets_at: '2026-10-19T00:00:00Z' };

describe('daily reflection web parity', () => {
  test('rotates using persisted server usage without changing the slots or their capture metadata', () => {
    const rows = [ai, catalog('one'), catalog('two')];
    expect(rotateReflections(rows, 1)).toEqual([rows[1], rows[2], rows[0]]);
    expect(rotateReflections(rows, 2)).toEqual([rows[2], rows[0], rows[1]]);
    expect(rotateReflections(rows, 3)).toEqual(rows);
    expect(rows[0]).toBe(ai);
    expect(reflectionCapture(rotateReflections(rows, 1)[0])).toEqual({
      prompt_type: 'static', prompt_id: 'one', pinned_text: 'Reflect on one', reflection_day_key: '2026-10-18',
    });
  });
  test('preserves the AI prompt text and original day without manufacturing a catalog ID', () => {
    expect(reflectionCapture(ai)).toEqual({
      prompt_type: 'ai-generated', pinned_text: 'What brings you joy?', reflection_day_key: '2026-10-18',
    });
  });
  test('keeps answered slots visible but prevents recapture; rejects a missing catalog ID', () => {
    const answered = { ...ai, answered: true };
    expect(rotateReflections([answered, catalog('one')], 1)).toContain(answered);
    expect(reflectionCapture(answered)).toBeNull();
    expect(reflectionCapture(catalog(''))).toBeNull();
  });
  test('disables shuffle while loading, pending, exhausted, or with fewer than two cards', () => {
    expect(canShuffleReflections(3, usage, false)).toBe(true);
    expect(canShuffleReflections(3, { ...usage, used: 1, remaining: 1 }, false)).toBe(true);
    expect(canShuffleReflections(3, { ...usage, used: 2, remaining: 0, allowed: false }, false)).toBe(false);
    expect(canShuffleReflections(3, undefined, false)).toBe(false);
    expect(canShuffleReflections(3, usage, true)).toBe(false);
    expect(canShuffleReflections(1, usage, false)).toBe(false);
    expect(canShuffleReflections(0, usage, false)).toBe(false);
    expect(rotateReflections([], 2)).toEqual([]);
  });
  test('matches web display floors, preserves exact counts above 30, and keeps counts stable on shuffle', () => {
    const rows = [ai, catalog('one', 12), catalog('two', 12345), catalog('three', 31)];
    const counts = getPromptReplyCounts(rows);
    expect(counts[1]).toBeGreaterThanOrEqual(30);
    expect(counts[2]).toBe(12345);
    expect(counts[3]).toBe(31);
    expect(new Set(counts).size).toBe(counts.length);
    expect(getPromptReplyCounts(rotateReflections(rows, 1))).toEqual(rotateReflections(counts, 1));
  });
  test('uses different decorative stacks and replaces every portrait on shuffle', () => {
    const order = shuffleAvatarOrder(Array.from({ length: 20 }, (_, i) => i));
    expect(order.length).toBe(20);
    expect(new Set(order).size).toBe(20);
    const first = avatarsForCard(order, 0);
    expect(avatarsForCard(order, 1).every((face) => !first.includes(face))).toBe(true);
    const refreshed = refreshAvatarOrder(order);
    for (let i = 0; i < 3; i++) {
      expect(avatarsForCard(refreshed, i).every((face) => !avatarsForCard(order, i).includes(face))).toBe(true);
    }
  });
});
