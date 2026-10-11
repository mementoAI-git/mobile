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

  test('copies held frames, so a reused recorder buffer does not change them', () => {
    const { gate: g } = gate();
    const buffer = frame(0.04);
    g.process(buffer, true);
    buffer.fill(0.5);

    expect(levels(g.process(frame(0.2), true))).toEqual([0.04, 0.2]);
  });

  test('reset drops held frames and closes the mic', () => {
    const { gate: g } = gate();
    g.process(frame(0.2), true);
    g.process(frame(0.03), true);
    g.reset();

    expect(g.process(frame(0.03), true)).toEqual([]);
  });
});
