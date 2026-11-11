/**
 * Recording a voice conversation with Memento. The native module mixes what
 * the user heard from Memento with the user's microphone into one file; this
 * side feeds it the mic, notes when each transcript turn started on the
 * recording's clock, and turns that into timed, speaker-labelled segments for
 * the transcript player.
 */

export type RecordingSpeaker = 'user' | 'ai';

export type RecordingSegment = {
  /** Seconds from the start of the recording. */
  start: number;
  end: number;
  text: string;
  speaker: RecordingSpeaker;
};

export type RecordingTurn = { role: RecordingSpeaker; text: string };

/** A stretch of the recording where someone was audible, in seconds. */
export type SpeechSpan = { start: number; end: number };

/** Length of one character of the native activity map. */
export const ACTIVITY_WINDOW_MS = 100;
/** Pauses shorter than this inside speech stay part of it (breaths, gaps between words). */
const SPEECH_GAP_BRIDGE_MS = 400;
/** Blips shorter than this (a click, a cough) are not speech. */
const SPEECH_MIN_MS = 200;

/** Turns the native activity map ('1' audible, '0' silence per 100 ms) into speech spans. */
export function speechSpansFromActivity(activity: string | undefined): SpeechSpan[] {
  if (!activity) return [];
  const raw: Array<[number, number]> = [];
  let runStart = -1;
  for (let i = 0; i <= activity.length; i += 1) {
    const on = activity[i] === '1';
    if (on && runStart < 0) runStart = i;
    if (!on && runStart >= 0) {
      raw.push([runStart * ACTIVITY_WINDOW_MS, i * ACTIVITY_WINDOW_MS]);
      runStart = -1;
    }
  }
  const merged: Array<[number, number]> = [];
  for (const span of raw) {
    const last = merged[merged.length - 1];
    if (last && span[0] - last[1] < SPEECH_GAP_BRIDGE_MS) last[1] = span[1];
    else merged.push([...span]);
  }
  return merged
    .filter(([start, end]) => end - start >= SPEECH_MIN_MS)
    .map(([start, end]) => ({ start: start / 1000, end: end / 1000 }));
}

/** The native recorder (react-native-memento-voice), or null on builds without it. */
export interface CallRecorderNative {
  startRecording(path: string): boolean;
  pushMic(samples: ArrayBuffer): void;
  recordingMs(): number;
  stopRecording(): { path: string; durationMs: number; activity?: string } | null;
}

/**
 * Speech recognition reports the user's words a little after they start
 * speaking, so their turns are moved back by about this much.
 */
export const USER_TRANSCRIPT_LAG_MS = 800;

/**
 * Timed segments for the transcript: each turn starts where it was first seen
 * (or right after the previous turn when it never was), and ends where the
 * next one starts, so the timeline has no overlaps and covers the recording.
 */
export function buildRecordingSegments(
  turns: RecordingTurn[],
  startsMs: ReadonlyMap<number, number>,
  durationMs: number,
): RecordingSegment[] {
  const total = Math.max(0, durationMs);
  const starts: number[] = [];
  let previous = 0;
  turns.forEach((_, index) => {
    const seen = startsMs.get(index);
    const start = Math.min(total, Math.max(previous, seen ?? previous));
    starts.push(start);
    previous = start;
  });
  const segments: RecordingSegment[] = [];
  turns.forEach((turn, index) => {
    const text = turn.text.trim();
    if (!text) return;
    const start = starts[index];
    const end = Math.max(start, index + 1 < starts.length ? starts[index + 1] : total);
    segments.push({
      start: round(start / 1000),
      end: round(end / 1000),
      text,
      speaker: turn.role,
    });
  });
  return segments;
}

function round(seconds: number) {
  return Math.round(seconds * 100) / 100;
}

/**
 * One call's recording. Mic frames arrive about every 40 ms; while muted they
 * are recorded as silence so nothing said on mute ends up in the file.
 */
export class CallRecordingSession {
  private readonly startsMs = new Map<number, number>();
  private active = false;

  constructor(private readonly native: CallRecorderNative) {}

  start(path: string): boolean {
    this.active = this.native.startRecording(path);
    return this.active;
  }

  get isActive() {
    return this.active;
  }

  pushMic(samples: Float32Array, muted: boolean) {
    if (!this.active) return;
    const frame = muted ? new Float32Array(samples.length) : Float32Array.from(samples);
    this.native.pushMic(frame.buffer as ArrayBuffer);
  }

  /** Call whenever transcript turns change; only a turn's first sighting counts. */
  noteTurns(turns: RecordingTurn[]) {
    if (!this.active) return;
    const now = this.native.recordingMs();
    turns.forEach((turn, index) => {
      if (this.startsMs.has(index) || !turn.text.trim()) return;
      this.startsMs.set(index, turn.role === 'user' ? Math.max(0, now - USER_TRANSCRIPT_LAG_MS) : now);
    });
  }

  /** Stops and returns the file with its segments, or null when nothing was recorded. */
  stop(turns: RecordingTurn[]): { path: string; durationMs: number; segments: RecordingSegment[]; speech: SpeechSpan[] } | null {
    if (!this.active) return null;
    this.active = false;
    const result = this.native.stopRecording();
    if (!result) return null;
    return {
      path: result.path,
      durationMs: result.durationMs,
      segments: buildRecordingSegments(turns, this.startsMs, result.durationMs),
      speech: speechSpansFromActivity(result.activity),
    };
  }
}
