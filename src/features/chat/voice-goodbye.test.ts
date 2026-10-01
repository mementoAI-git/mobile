import { describe, expect, test } from 'bun:test';

import { GOODBYE_MAX_MS, GOODBYE_QUIET_MS, GoodbyeTracker } from './voice-goodbye';

describe('GoodbyeTracker', () => {
  test('goodbye spoken before the tool call: waits for playback, then the quiet period', () => {
    const tracker = new GoodbyeTracker(0);

    expect(tracker.shouldHangUp(500, true)).toBe(false);
    expect(tracker.shouldHangUp(1_000, false)).toBe(false);
    expect(tracker.shouldHangUp(GOODBYE_QUIET_MS, false)).toBe(true);
  });

  test('goodbye spoken after the tool response: waits for that turn to finish playing', () => {
    const tracker = new GoodbyeTracker(0);

    tracker.onModelAudio();
    expect(tracker.shouldHangUp(2_000, false)).toBe(false);

    tracker.onTurnComplete();
    expect(tracker.shouldHangUp(2_100, true)).toBe(false);
    expect(tracker.shouldHangUp(2_600, false)).toBe(true);
  });

  test('more speech after a completed turn waits again', () => {
    const tracker = new GoodbyeTracker(0);

    tracker.onModelAudio();
    tracker.onTurnComplete();
    tracker.onModelAudio();

    expect(tracker.shouldHangUp(3_000, false)).toBe(false);
  });

  test('always hangs up by the cap', () => {
    const tracker = new GoodbyeTracker(0);
    tracker.onModelAudio();

    expect(tracker.shouldHangUp(GOODBYE_MAX_MS, true)).toBe(true);
  });
});