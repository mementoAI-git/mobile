import { describe, expect, test } from 'bun:test';

import { VOICE_ECHO_PRE_ROLL_FRAMES, VoiceEchoGate } from './voice-echo-gate';

const FRAME = 640;
const HOLD_MS = 1_500;
const frame = (level: number) => new Float32Array(FRAME).fill(level);
// Rounded: samples are float32.
const levels = (frames: Float32Array[]) => frames.map((f) => Math.round(f[0] * 1000) / 1000);

// Levels: 0.03 is leftover echo; 0.08 is ordinary speech (passes the barge-in
// check); 0.2 is a loud, unmistakable voice.
function gate() {
  const clock = { now: 10_000 };
  return { clock, gate: new VoiceEchoGate({ now: () => clock.now, holdMs: HOLD_MS }) };
}

describe('VoiceEchoGate', () => {
  test('passes every frame straight through while Memento is not audible', () => {
    const { gate: g } = gate();
    expect(levels(g.process(frame(0.01), false))).toEqual([0.01]);
    expect(g.suppressed).toBe(0);
  });

  test('holds echo briefly, then sends it as silence, keeping the stream continuous', () => {
    const { gate: g } = gate();
    const sent: Float32Array[] = [];
    for (let i = 0; i < VOICE_ECHO_PRE_ROLL_FRAMES + 2; i += 1) sent.push(...g.process(frame(0.03), true));

    expect(levels(sent)).toEqual([0, 0]);
    expect(g.suppressed).toBe(2);
    expect(g.bargeIns).toBe(0);
  });

  test('keeps the soft start of a word once speech is confirmed', () => {
    const { gate: g } = gate();
    const sent = [
      ...g.process(frame(0.04), true), // soft onset, below the barge-in level
      ...g.process(frame(0.08), true),
      ...g.process(frame(0.08), true), // second speech frame confirms
    ];

    expect(levels(sent)).toEqual([0.04, 0.08, 0.08]);
    expect(g.bargeIns).toBe(1);
    expect(g.suppressed).toBe(0);
  });

  test('does not open the mic for a single loud transient', () => {
    const { gate: g } = gate();
    const sent: Float32Array[] = [];
    sent.push(...g.process(frame(0.09), true)); // a click
    for (let i = 0; i < VOICE_ECHO_PRE_ROLL_FRAMES + 1; i += 1) sent.push(...g.process(frame(0.03), true));

    expect(g.bargeIns).toBe(0);
    expect(sent.every((f) => f.every((s) => s === 0))).toBe(true);
  });

  test('a very loud voice opens the mic at once', () => {
    const { gate: g } = gate();
    expect(levels(g.process(frame(0.2), true))).toEqual([0.2]);
    expect(g.bargeIns).toBe(1);
  });

  test('keeps the mic open for the rest of the sentence, then filters again', () => {
    const { clock, gate: g } = gate();
    g.process(frame(0.2), true);
    clock.now += 400;
    expect(levels(g.process(frame(0.03), true))).toEqual([0.03]); // softer word
    clock.now += HOLD_MS;
    expect(g.process(frame(0.03), true)).toEqual([]); // held again
  });

  test('sends held echo as silence when Memento stops, before the next live frame', () => {
    const { gate: g } = gate();
    g.process(frame(0.03), true);
    g.process(frame(0.03), true);

    expect(levels(g.process(frame(0.05), false))).toEqual([0, 0, 0.05]);
  });

  test('does not carry an open mic into the next reply after playback stops', () => {
    const { clock, gate: g } = gate();
    g.process(frame(0.03), true, { learnOnly: true });
    g.process(frame(0.2), true); // user interrupts
    clock.now += 200;
    expect(levels(g.process(frame(0.05), false))).toEqual([0.05]);
    clock.now += 200; // next reply begins before the old hold expires

    expect(g.process(frame(0.03), true)).toEqual([]);
    expect(g.echoLevel).toBeCloseTo(0.03);
    expect(g.bargeIns).toBe(1);
  });

  test('reply calibration cancels an earlier open mic without forgetting the echo level', () => {
    const { clock, gate: g } = gate();
    g.process(frame(0.2), true);
    clock.now += 200;
    // A fast reply can start without a non-gating mic frame between replies.
    expect(levels(g.process(frame(0.1), true, { learnOnly: true }))).toEqual([0]);
    clock.now += 300;

    expect(g.process(frame(0.1), true)).toEqual([]);
    expect(g.echoLevel).toBeCloseTo(0.1);
    expect(g.bargeIns).toBe(1);
  });

  test('copies held frames, so a reused recorder buffer does not change them', () => {
    const { gate: g } = gate();
    const buffer = frame(0.04);
    g.process(buffer, true);
    buffer.fill(0.5);

    expect(levels(g.process(frame(0.2), true))).toEqual([0.04, 0.2]);
  });

  describe('tracking the leftover echo', () => {
    // Feeds frames while Memento is audible; returns everything sent.
    const feed = (g: VoiceEchoGate, level: number, count: number) => {
      const sent: Float32Array[] = [];
      for (let i = 0; i < count; i += 1) sent.push(...g.process(frame(level), true));
      return sent;
    };

    test('raises the bar when the leftover echo is loud, as at high speaker volume', () => {
      const { gate: g } = gate();
      feed(g, 0.06, 8); // loud leftover echo, below the fixed barge-in level

      // Would open the mic on fixed thresholds, but is barely above the echo.
      const sent = feed(g, 0.08, 2);

      expect(g.bargeIns).toBe(0);
      expect(sent.every((f) => f.every((s) => s === 0))).toBe(true);
    });

    test('still lets a voice clearly louder than the echo through', () => {
      const { gate: g } = gate();
      feed(g, 0.06, 8);

      feed(g, 0.15, 1);

      expect(g.bargeIns).toBe(1);
    });

    test('a loud echo burst does not open the mic, even above the fixed thresholds', () => {
      const { gate: g } = gate();
      feed(g, 0.07, 8);

      feed(g, 0.1, 3);

      expect(g.bargeIns).toBe(0);
    });

    test('lowers the bar again as the echo fades, so quiet interruptions work at low volume', () => {
      const { gate: g } = gate();
      feed(g, 0.06, 8);
      feed(g, 0.01, 150); // volume turned down

      feed(g, 0.08, 2);

      expect(g.bargeIns).toBe(1);
    });

    test('remembers the echo level from one reply to the next', () => {
      const { gate: g } = gate();
      feed(g, 0.06, 8);
      g.process(frame(0.01), false); // Memento finished; the user is quiet

      feed(g, 0.08, 2); // the next reply's echo

      expect(g.bargeIns).toBe(0);
    });

    test('calibrating (the greeting) never opens the mic, but learns the echo for later', () => {
      const { gate: g } = gate();
      const sent: Float32Array[] = [];
      for (let i = 0; i < 10; i += 1) sent.push(...g.process(frame(0.12), true, { learnOnly: true }));

      expect(g.bargeIns).toBe(0);
      expect(sent).toHaveLength(10); // nothing held back: all sent as silence at once
      expect(sent.every((f) => f.every((s) => s === 0))).toBe(true);

      // Loud echo of the next reply no longer gets through.
      feed(g, 0.12, 3);
      expect(g.bargeIns).toBe(0);
    });

    test('does not learn the echo level from the user speaking while Memento is quiet', () => {
      const { gate: g } = gate();
      for (let i = 0; i < 20; i += 1) g.process(frame(0.2), false);

      feed(g, 0.08, 2);

      expect(g.bargeIns).toBe(1);
    });
  });

  test('reset drops held frames and closes the mic', () => {
    const { gate: g } = gate();
    g.process(frame(0.2), true);
    g.process(frame(0.03), true);
    g.reset();

    expect(g.process(frame(0.03), true)).toEqual([]);
  });
});
