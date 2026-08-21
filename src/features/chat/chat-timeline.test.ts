// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('chat timeline day separators', () => {
  test('labels day boundaries using familiar chat dates', async () => {
    let timeline: typeof import('./chat-timeline') | undefined;
    try {
      timeline = await import('./chat-timeline');
    } catch {
      // Expected on the first red run.
    }
    expect(timeline?.getChatDayLabel).toBeFunction();
    const now = new Date('2026-08-20T12:00:00.000Z');

    expect(timeline!.getChatDayLabel('2026-08-20T08:00:00.000Z', now)).toBe('Today');
    expect(timeline!.getChatDayLabel('2026-08-19T08:00:00.000Z', now)).toBe('Yesterday');
    expect(timeline!.getChatDayLabel('2026-08-17T08:00:00.000Z', now)).toBe('Aug 17, 2026');
    expect(timeline!.shouldShowChatDaySeparator(undefined, '2026-08-20T08:00:00.000Z')).toBe(true);
    expect(timeline!.shouldShowChatDaySeparator('2026-08-20T07:00:00.000Z', '2026-08-20T08:00:00.000Z')).toBe(false);
    expect(timeline!.shouldShowChatDaySeparator('2026-08-19T23:00:00.000Z', '2026-08-20T08:00:00.000Z')).toBe(true);
  });
});
