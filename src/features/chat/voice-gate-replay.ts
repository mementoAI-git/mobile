import { VOICE_BARGE_IN_HOLD_MS, VOICE_REPLY_ONSET_MS, VoiceEchoGate } from './voice-echo-gate';

/**
 * Replays a recorded call's microphone through the loudspeaker echo gate and
 * scores it against human labels of when the user actually spoke. This is how
 * gate changes are judged: on real recordings, not by feel.
 *
 * A capture (see voice-gate-capture.ts) holds the raw mic, before any gating,
 * plus which frames Memento was audible on the loudspeaker and which fell in
 * the greeting. The replay applies the same rules as VoiceAudioEngine in full
 * duplex: gate while audible, calibrate only during the greeting and the
 * first VOICE_REPLY_ONSET_MS of each reply.
 *
 * Labels are an Audacity label track (File > Export > Labels) marking the
 * user's speech on the capture's WAV.
 */

/** The engine's mic frame (VOICE_INPUT_FRAMES): 640 samples at 16 kHz. */
export const VOICE_CAPTURE_FRAME_SAMPLES = 640;
export const VOICE_CAPTURE_FRAME_MS = 40;

/** Frame indices, start inclusive, end exclusive. */
export type FrameRange = [number, number];

export type VoiceGateCaptureFile = {
  version: 1;
  sampleRate: number;
  frameSamples: number;
  frames: number;
  /** Memento audible on the loudspeaker (not headphones). */
  audibleOnSpeaker: FrameRange[];
  /** The greeting shield was up. */
  greetingShield: FrameRange[];
  meta?: Record<string, unknown>;
};

export type SpeechLabel = { startMs: number; endMs: number };

/** Anything with VoiceEchoGate's process(), so a replacement can be scored. */
export type ReplayGate = {
  process(samples: Float32Array, gating: boolean, options?: { learnOnly?: boolean }): Float32Array[];
};

export type VoiceGateReplayReport = {
  audibleSeconds: number;
  /** User speech that started while Memento was audible. */
  interruptions: {
    attempts: number;
    heard: number;
    missed: number;
    /** Per heard attempt: speech lost before the first frame got through. */
    onsetClipMs: number[];
  };
  userSpeechWhileAudible: { totalMs: number; passedMs: number };
  /** Runs of frames that got through while Memento talked and the user did not. */
  falseOpenings: number;
  falseOpeningsPerMinute: number;
  leakedMs: number;
};

export function toRanges(flags: boolean[]): FrameRange[] {
  const ranges: FrameRange[] = [];
  let start = -1;
  flags.forEach((flag, index) => {
    if (flag && start < 0) start = index;
    if (!flag && start >= 0) {
      ranges.push([start, index]);
      start = -1;
    }
  });
  if (start >= 0) ranges.push([start, flags.length]);
  return ranges;
}

function toFlags(ranges: FrameRange[], frames: number): boolean[] {
  const flags = new Array<boolean>(frames).fill(false);
  for (const [start, end] of ranges) {
    for (let index = Math.max(0, start); index < Math.min(end, frames); index += 1) flags[index] = true;
  }
  return flags;
}

export function parseAudacityLabels(text: string): SpeechLabel[] {
  const labels: SpeechLabel[] = [];
  for (const line of text.split(/\r?\n/)) {
    // Spectral-selection lines start with a backslash.
    if (!line.trim() || line.startsWith('\\')) continue;
    const [start, end] = line.split('\t').map(Number);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      labels.push({ startMs: Math.round(start * 1_000), endMs: Math.round(end * 1_000) });
    }
  }
  return labels;
}

function isAllZero(samples: Float32Array): boolean {
  for (let index = 0; index < samples.length; index += 1) if (samples[index] !== 0) return false;
  return true;
}

export function replayEchoGate({
  capture,
  samples,
  labels,
  createGate = (now) => new VoiceEchoGate({ now, holdMs: VOICE_BARGE_IN_HOLD_MS }),
}: {
  capture: VoiceGateCaptureFile;
  samples: Float32Array;
  labels: SpeechLabel[];
  createGate?: (now: () => number) => ReplayGate;
}): VoiceGateReplayReport {
  const size = capture.frameSamples;
  const frames = Math.min(capture.frames, Math.floor(samples.length / size));
  const frameMs = (size / capture.sampleRate) * 1_000;
  const audible = toFlags(capture.audibleOnSpeaker, frames);
  const greeting = toFlags(capture.greetingShield, frames);
  // A frame is the user's when its midpoint falls inside a label.
  const user = Array.from({ length: frames }, (_, index) => {
    const mid = (index + 0.5) * frameMs;
    return labels.some((label) => mid >= label.startMs && mid < label.endMs);
  });

  let clock = 0;
  const gate = createGate(() => clock);
  const inputs: Float32Array[] = [];
  // Outputs come back in input order, some later (pre-roll), so the nth
  // output is the nth input. Silenced frames come back zeroed.
  const spoken: boolean[] = [];
  let audibleSince = -1;
  for (let index = 0; index < frames; index += 1) {
    clock = index * frameMs;
    const frame = samples.subarray(index * size, (index + 1) * size);
    inputs.push(frame);
    if (!audible[index]) audibleSince = -1;
    else if (audibleSince < 0) audibleSince = clock;
    const replyOnset = audible[index] && clock - audibleSince < VOICE_REPLY_ONSET_MS;
    for (const out of gate.process(frame, audible[index], { learnOnly: greeting[index] || replyOnset })) {
      const input = inputs[spoken.length];
      spoken.push(input !== undefined && !isAllZero(input) && !isAllZero(out));
    }
  }
  // Frames still held at the end were never sent.
  while (spoken.length < frames) spoken.push(false);

  const report: VoiceGateReplayReport = {
    audibleSeconds: (audible.filter(Boolean).length * frameMs) / 1_000,
    interruptions: { attempts: 0, heard: 0, missed: 0, onsetClipMs: [] },
    userSpeechWhileAudible: { totalMs: 0, passedMs: 0 },
    falseOpenings: 0,
    falseOpeningsPerMinute: 0,
    leakedMs: 0,
  };

  for (const label of labels) {
    const first = Math.floor(label.startMs / frameMs);
    if (first >= frames || !audible[first]) continue;
    report.interruptions.attempts += 1;
    let heardAt = -1;
    for (let index = first; index < frames && (index + 0.5) * frameMs < label.endMs; index += 1) {
      if (user[index] && spoken[index]) {
        heardAt = index;
        break;
      }
    }
    if (heardAt < 0) {
      report.interruptions.missed += 1;
    } else {
      report.interruptions.heard += 1;
      report.interruptions.onsetClipMs.push(Math.max(0, Math.round(heardAt * frameMs - label.startMs)));
    }
  }

  // A run of frames sent while Memento talked. With the user's speech in it,
  // its echo frames are the pre-roll and hold around a real interruption;
  // without, the mic opened for nothing.
  let runHasUser = false;
  let runOpen = false;
  const closeRun = () => {
    if (runOpen && !runHasUser) report.falseOpenings += 1;
    runOpen = false;
    runHasUser = false;
  };
  for (let index = 0; index < frames; index += 1) {
    if (audible[index] && user[index]) {
      report.userSpeechWhileAudible.totalMs += frameMs;
      if (spoken[index]) report.userSpeechWhileAudible.passedMs += frameMs;
    }
    if (!(audible[index] && spoken[index])) {
      closeRun();
      continue;
    }
    runOpen = true;
    if (user[index]) runHasUser = true;
    else report.leakedMs += frameMs;
  }
  closeRun();
  report.falseOpeningsPerMinute =
    report.audibleSeconds > 0 ? report.falseOpenings / (report.audibleSeconds / 60) : 0;
  return report;
}
