import { describe, expect, test } from 'bun:test';

import {
  parseAudacityLabels,
  replayEchoGate,
  toRanges,
  VOICE_CAPTURE_FRAME_MS,
  VOICE_CAPTURE_FRAME_SAMPLES,
  type SpeechLabel,
  type VoiceGateCaptureFile,
} from './voice-gate-replay';

// Levels as in voice-echo-gate.test.ts: 0.03 is leftover echo, 0.08 ordinary
// speech, 0.2 a loud transient.
type Segment = { frames: number; level: number; audible: boolean; greeting?: boolean };

function recording(segments: Segment[]) {
  const levels: number[] = [];
  const audible: boolean[] = [];
  const greeting: boolean[] = [];
  for (const segment of segments) {
    for (let i = 0; i < segment.frames; i += 1) {
      levels.push(segment.level);
      audible.push(segment.audible);
      greeting.push(segment.greeting ?? false);
    }
  }
  const samples = new Float32Array(levels.length * VOICE_CAPTURE_FRAME_SAMPLES);
  levels.forEach((level, index) =>
    samples.fill(level, index * VOICE_CAPTURE_FRAME_SAMPLES, (index + 1) * VOICE_CAPTURE_FRAME_SAMPLES),
  );
  const capture: VoiceGateCaptureFile = {
    version: 1,
    sampleRate: 16_000,
    frameSamples: VOICE_CAPTURE_FRAME_SAMPLES,
    frames: levels.length,
    audibleOnSpeaker: toRanges(audible),
    greetingShield: toRanges(greeting),
  };
  return { capture, samples };
}

const ms = (frames: number) => frames * VOICE_CAPTURE_FRAME_MS;

describe('toRanges', () => {
  test('turns per-frame flags into [start, end) runs', () => {
    expect(toRanges([false, true, true, false, true])).toEqual([
      [1, 3],
      [4, 5],
    ]);
    expect(toRanges([])).toEqual([]);
  });
});

describe('parseAudacityLabels', () => {
  test('reads an Audacity label track export, in seconds, as milliseconds', () => {
    const text = '1.000000\t2.500000\tuser\n\\\t0.000000\t0.000000\n\n3.25\t4\twait\n';
    expect(parseAudacityLabels(text)).toEqual([
      { startMs: 1_000, endMs: 2_500 },
      { startMs: 3_250, endMs: 4_000 },
    ]);
  });
});

describe('replayEchoGate', () => {
  test('echo alone never opens the mic', () => {
    const { capture, samples } = recording([{ frames: 125, level: 0.03, audible: true }]);
    const report = replayEchoGate({ capture, samples, labels: [] });

    expect(report.audibleSeconds).toBe(5);
    expect(report.falseOpenings).toBe(0);
    expect(report.leakedMs).toBe(0);
    expect(report.interruptions.attempts).toBe(0);
  });

  test('an ordinary interruption is heard from its first word', () => {
    // 1 s of echo teaches the gate, then the user talks over Memento for 1 s.
    const { capture, samples } = recording([
      { frames: 25, level: 0.03, audible: true },
      { frames: 25, level: 0.08, audible: true },
      { frames: 25, level: 0.03, audible: true },
    ]);
    const labels: SpeechLabel[] = [{ startMs: ms(25), endMs: ms(50) }];
    const report = replayEchoGate({ capture, samples, labels });

    expect(report.interruptions).toMatchObject({ attempts: 1, heard: 1, missed: 0 });
    expect(report.interruptions.onsetClipMs).toEqual([0]);
    expect(report.userSpeechWhileAudible.passedMs).toBe(ms(25));
    expect(report.falseOpenings).toBe(0);
  });

  test('a quiet voice under loud echo is reported as missed', () => {
    const { capture, samples } = recording([
      { frames: 25, level: 0.06, audible: true },
      { frames: 25, level: 0.07, audible: true },
    ]);
    const labels: SpeechLabel[] = [{ startMs: ms(25), endMs: ms(50) }];
    const report = replayEchoGate({ capture, samples, labels });

    expect(report.interruptions).toMatchObject({ attempts: 1, heard: 0, missed: 1 });
    expect(report.userSpeechWhileAudible.passedMs).toBe(0);
  });

  test('a loud unlabelled transient counts as a false opening', () => {
    const { capture, samples } = recording([
      { frames: 25, level: 0.03, audible: true },
      { frames: 1, level: 0.2, audible: true },
      { frames: 25, level: 0.03, audible: true },
    ]);
    const report = replayEchoGate({ capture, samples, labels: [] });

    expect(report.falseOpenings).toBe(1);
    expect(report.falseOpeningsPerMinute).toBeGreaterThan(0);
    expect(report.leakedMs).toBeGreaterThan(0);
  });

  test('speech while Memento is silent is not an interruption', () => {
    const { capture, samples } = recording([
      { frames: 25, level: 0.03, audible: true },
      { frames: 25, level: 0.08, audible: false },
    ]);
    const labels: SpeechLabel[] = [{ startMs: ms(25), endMs: ms(50) }];
    const report = replayEchoGate({ capture, samples, labels });

    expect(report.interruptions.attempts).toBe(0);
    expect(report.falseOpenings).toBe(0);
  });

  test('speech already under way when a reply starts is learned as echo and missed, as live', () => {
    // The engine treats the first 300 ms of each reply as echo calibration.
    // A voice heard then sets the echo level at its own loudness, so the rest
    // of the sentence is never twice as loud as "echo". Known risk (17 Oct
    // speaker review); this pins it so a fix shows up in the numbers.
    const { capture, samples } = recording([
      { frames: 25, level: 0, audible: false },
      { frames: 25, level: 0.08, audible: true },
    ]);
    const labels: SpeechLabel[] = [{ startMs: ms(25), endMs: ms(50) }];
    const report = replayEchoGate({ capture, samples, labels });

    expect(report.interruptions).toMatchObject({ attempts: 1, heard: 0, missed: 1 });
  });

  test('the greeting is calibration only: nothing passes while it plays', () => {
    const { capture, samples } = recording([
      { frames: 25, level: 0.08, audible: true, greeting: true },
    ]);
    const labels: SpeechLabel[] = [{ startMs: 0, endMs: ms(25) }];
    const report = replayEchoGate({ capture, samples, labels });

    expect(report.interruptions).toMatchObject({ attempts: 1, heard: 0, missed: 1 });
  });

  test('scores any gate with the same interface, so a replacement can be compared', () => {
    const { capture, samples } = recording([
      { frames: 25, level: 0.03, audible: true },
      { frames: 25, level: 0.08, audible: true },
    ]);
    const labels: SpeechLabel[] = [{ startMs: ms(25), endMs: ms(50) }];
    const closed = {
      process: (frame: Float32Array) => [new Float32Array(frame.length)],
    };
    const report = replayEchoGate({ capture, samples, labels, createGate: () => closed });

    expect(report.interruptions.missed).toBe(1);
  });
});
