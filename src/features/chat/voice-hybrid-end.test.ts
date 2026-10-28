import { describe, expect, test } from 'bun:test';

import { parseHybridEndMs, VoiceHybridEnd } from './voice-hybrid-end';
import { VoiceThinkingTracker } from './voice-thinking';

describe('VoiceHybridEnd', () => {
  test('is off unless a positive delay is configured', () => {
    expect(parseHybridEndMs(undefined)).toBe(0);
    expect(parseHybridEndMs('')).toBe(0);
    expect(parseHybridEndMs('abc')).toBe(0);
    expect(parseHybridEndMs('-5')).toBe(0);
    expect(parseHybridEndMs('300')).toBe(300);
    expect(new VoiceHybridEnd(0).check(10_000, false)).toBe(false);
  });

  test('ends the turn once, after the user has been quiet long enough', () => {
    const end = new VoiceHybridEnd(300);
    expect(end.check(undefined, false)).toBe(false); // nothing said yet
    expect(end.check(200, false)).toBe(false);
    expect(end.check(300, false)).toBe(true);
    expect(end.check(400, false)).toBe(false); // already sent for this pause
  });

  test('speaking again arms it for the next pause', () => {
    const end = new VoiceHybridEnd(300);
    expect(end.check(300, false)).toBe(true);
    expect(end.check(0, false)).toBe(false); // talking again
    expect(end.check(320, false)).toBe(true);
  });

  test('never ends a turn while Memento is speaking', () => {
    const end = new VoiceHybridEnd(300);
    expect(end.check(1_000, true)).toBe(false);
  });

  test('a new turn (nothing heard yet) re-arms it', () => {
    const end = new VoiceHybridEnd(300);
    expect(end.check(300, false)).toBe(true);
    expect(end.check(undefined, false)).toBe(false);
    expect(end.check(300, false)).toBe(true);
  });
});

describe('VoiceThinkingTracker.quietForMs', () => {
  test('is undefined until the user has spoken, then counts the quiet since', () => {
    let now = 1_000;
    const tracker = new VoiceThinkingTracker(() => now);
    expect(tracker.quietForMs()).toBeUndefined();
    for (let i = 0; i < 6; i += 1) {
      tracker.observeMic(0.1);
      now += 40;
    }
    expect(tracker.quietForMs()).toBe(40);
    now += 260;
    expect(tracker.quietForMs()).toBe(300);
    tracker.reset();
    expect(tracker.quietForMs()).toBeUndefined();
  });
});
