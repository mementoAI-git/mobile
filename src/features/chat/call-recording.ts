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

/** Mic level (RMS) that counts as the user speaking. */
export const MIC_SPEECH_RMS = 0.012;
/** Speech must last this long to count, so clicks and breaths don't. */
const MIC_SPEECH_MIN_MS = 120;
/** Quiet for this long ends a stretch of the user's speech. */
const MIC_SILENCE_RESET_MS = 1200;
const MIC_SAMPLE_RATE = 16_000;

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

/** "ai:0", "user:0", "ai:1", …: which of that speaker's turns each one is. */
function turnKeys(turns: RecordingTurn[]) {
  const counts = { user: 0, ai: 0 };
  return turns.map((turn) => `${turn.role}:${counts[turn.role]++}`);
}

function round(seconds: number) {
  return Math.round(seconds * 100) / 100;
}

/**
 * One call's recording. Mic frames arrive about every 40 ms; while muted they
 * are recorded as silence so nothing said on mute ends up in the file.
 */
export class CallRecordingSession {
  /**
   * When each turn was first seen, keyed by speaker and occurrence ("user:2").
   * Not by list position: the live transcript inserts the user's words ahead of
   * a Memento reply that is already arriving, which shifts every later index.
   */
  private readonly startsMs = new Map<string, number>();
  private active = false;
  /** Where each stretch of the user's speech began on the recording, oldest first. */
  private readonly micOnsetsMs: number[] = [];
  private micVoicedMs = 0;
  private micVoicedFromMs = 0;
  private micQuietMs = MIC_SILENCE_RESET_MS;

  constructor(private readonly native: CallRecorderNative) {}

  start(path: string): boolean {
    this.active = this.native.startRecording(path);
    return this.active;
  }

  get isActive() {
    return this.active;
  }

  /**
   * `mementoAudible`: Memento is playing through the speaker, so what the mic
   * hears may be its echo rather than the user starting to speak.
   */
  pushMic(samples: Float32Array, muted: boolean, mementoAudible = false) {
    if (!this.active) return;
    const frame = muted ? new Float32Array(samples.length) : Float32Array.from(samples);
    this.noteMicLevel(frame, mementoAudible);
    this.native.pushMic(frame.buffer as ArrayBuffer);
  }

  /** Finds where the user starts speaking, straight from the mic. */
  private noteMicLevel(frame: Float32Array, mementoAudible: boolean) {
    if (!frame.length) return;
    let sum = 0;
    for (let i = 0; i < frame.length; i += 1) sum += frame[i] * frame[i];
    const frameMs = (frame.length / MIC_SAMPLE_RATE) * 1000;
    const voiced = !mementoAudible && Math.sqrt(sum / frame.length) >= MIC_SPEECH_RMS;
    if (!voiced) {
      this.micQuietMs += frameMs;
      if (this.micQuietMs >= MIC_SILENCE_RESET_MS) this.micVoicedMs = 0;
      return;
    }
    if (this.micVoicedMs === 0) {
      // This frame is about to be written, so it starts at the recording's current end.
      this.micVoicedFromMs = this.native.recordingMs();
    }
    const startsRun = this.micQuietMs >= MIC_SILENCE_RESET_MS;
    this.micVoicedMs += frameMs;
    if (startsRun && this.micVoicedMs >= MIC_SPEECH_MIN_MS) {
      this.micOnsetsMs.push(this.micVoicedFromMs);
      this.micQuietMs = 0;
    } else if (!startsRun) {
      this.micQuietMs = 0;
    }
  }

  /** Call whenever transcript turns change; only a turn's first sighting counts. */
  noteTurns(turns: RecordingTurn[]) {
    if (!this.active) return;
    const now = this.native.recordingMs();
    const keys = turnKeys(turns);
    keys.forEach((key, index) => {
      if (this.startsMs.has(key) || !turns[index].text.trim()) return;
      if (turns[index].role === 'ai') {
        this.startsMs.set(key, now);
        return;
      }
      // The user's words are transcribed a while after they start (sometimes
      // only after Memento has begun replying): use where the mic first heard
      // them after the turn before, else estimate back from now.
      const previous = index > 0 ? this.startsMs.get(keys[index - 1]) ?? -1 : -1;
      const onset = this.micOnsetsMs.find((ms) => ms > previous && ms <= now);
      this.startsMs.set(key, onset ?? Math.max(0, now - USER_TRANSCRIPT_LAG_MS));
    });
  }

  private startsByIndex(turns: RecordingTurn[]) {
    const starts = new Map<number, number>();
    turnKeys(turns).forEach((key, index) => {
      const start = this.startsMs.get(key);
      if (start !== undefined) starts.set(index, start);
    });
    return starts;
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
      segments: buildRecordingSegments(turns, this.startsByIndex(turns), result.durationMs),
      speech: speechSpansFromActivity(result.activity),
    };
  }
}

/**
 * Whether this build can record calls. The recorder takes Memento's voice
 * from native playback, which iOS always uses; Android only when the build
 * turns native playback on, or the recording would hold only the host.
 */
export function canRecordCalls(os: string, nativePlayback: boolean): boolean {
  return os === 'ios' || (os === 'android' && nativePlayback);
}
