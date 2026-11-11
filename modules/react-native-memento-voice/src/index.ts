import { Platform } from 'react-native';

import type { AudioContext } from 'react-native-audio-api';

import NativeMementoVoiceAudio from './specs/NativeMementoVoiceAudio';

export type NativeVoicePlaybackState =
  | 'idle'
  | 'priming'
  | 'playing'
  | 'recovering'
  | 'draining'
  | 'stopped';

export type NativeVoicePlaybackOptions = {
  sourceSampleRate?: number;
  startupBufferMs?: number;
  recoveryBufferMs?: number;
  maxBufferedMs?: number;
  /** The session's first audio rises from silence over this long (0: off). */
  warmupRampMs?: number;
};

export type NativeVoicePlaybackSnapshot = {
  state: NativeVoicePlaybackState;
  generation: number;
  epoch: number;
  bufferedMs: number;
  receivedFrames: number;
  convertedFrames: number;
  renderedFrames: number;
  droppedFrames: number;
  underrunCount: number;
  overflowCount: number;
  staleChunkCount: number;
  sequenceGapCount: number;
  malformedChunkCount: number;
  isAudible: boolean;
  /** Extra buffer the adaptive jitter buffer currently adds. */
  adaptiveExtraMs?: number;
  /** Output frames synthesized by packet loss concealment. */
  concealedFrames?: number;
};

type NativeAudioNode = {
  connect(destination: unknown, output?: number, input?: number): void;
  disconnect(): void;
};

type NativeVoiceSessionHost = {
  readonly node: NativeAudioNode;
  start(generation: number, epoch: number): void;
  pushPCM(base64Pcm: string, generation: number, epoch: number, sequence: number): boolean;
  flushTurn(generation: number, epoch: number): void;
  interrupt(generation: number, nextEpoch: number): void;
  getSnapshot(): NativeVoicePlaybackSnapshot;
  stop(generation: number): void;
};

declare global {
  // Installed synchronously by the native TurboModule.
  // eslint-disable-next-line no-var
  var __mementoCreateVoicePlaybackSession:
    | ((
        context: unknown,
        destination: unknown,
        options: Required<NativeVoicePlaybackOptions>,
      ) => NativeVoiceSessionHost)
    | undefined;
  // Process-wide call recorder, installed alongside the session factory.
  var __mementoVoiceRecorder: NativeVoiceRecorder | undefined;
}

export type NativeVoiceRecordingResult = {
  /** Absolute filesystem path of the finished 16-bit mono 16 kHz WAV. */
  path: string;
  /** Length on the recording clock (frames written). */
  durationMs: number;
  /** Speech activity, one character per 100 ms: '1' audible, '0' silence. Missing on older builds. */
  activity?: string;
};

/**
 * Records a call to WAV: every playback session's final output (what the
 * user heard, resampled to 16 kHz) mixed with the mic frames pushed here.
 * One recording per process; it survives playback session rebuilds.
 */
export type NativeVoiceRecorder = {
  /** Plain absolute path (no file://). False if it cannot open the file or a recording is running. */
  startRecording(path: string): boolean;
  /** Float32 mono 16 kHz mic PCM. An ArrayBuffer (a Float32Array view also works). No-op when not recording. */
  pushMic(samples: ArrayBuffer): void;
  /** Milliseconds written so far; 0 when not recording. */
  recordingMs(): number;
  /** Stops and finalises the WAV; null when nothing was recording. */
  stopRecording(): NativeVoiceRecordingResult | null;
};

const DEFAULT_OPTIONS: Required<NativeVoicePlaybackOptions> = {
  sourceSampleRate: 24_000,
  startupBufferMs: 180,
  recoveryBufferMs: 240,
  maxBufferedMs: 5_000,
  warmupRampMs: 0,
};

let installationAttempted = false;

function ensureInstalled(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  if (globalThis.__mementoCreateVoicePlaybackSession) return true;
  if (installationAttempted) return false;
  installationAttempted = true;
  return NativeMementoVoiceAudio?.install() === true;
}

/**
 * Whether iOS really engaged voice processing (echo cancellation) on the live
 * mic. Undefined off iOS, or on native builds that predate this method, so
 * callers keep their requested policy when the answer is unknown.
 */
export function readVoiceProcessingActive(): boolean | undefined {
  if (Platform.OS !== 'ios') return undefined;
  const module = NativeMementoVoiceAudio as { isVoiceProcessingActive?: () => boolean } | null;
  if (typeof module?.isVoiceProcessingActive !== 'function') return undefined;
  try {
    return module.isVoiceProcessingActive();
  } catch {
    return undefined;
  }
}

/**
 * The native call recorder, or null on platforms or native builds without it.
 */
export function getNativeVoiceRecorder(): NativeVoiceRecorder | null {
  ensureInstalled();
  const recorder = globalThis.__mementoVoiceRecorder;
  return recorder && typeof recorder.startRecording === 'function' ? recorder : null;
}

/**
 * Converts a finished call recording WAV to AAC M4A (mono, 16 kHz, ~32 kbps)
 * next to it, deletes the WAV, and resolves the M4A's absolute path.
 * iOS only: rejects with code E_UNSUPPORTED on Android (the WAV is kept), and
 * rejects on native builds that predate the method.
 */
export function convertRecordingToM4A(wavPath: string): Promise<string> {
  const module = NativeMementoVoiceAudio as {
    convertRecordingToM4A?: (path: string) => Promise<string>;
  } | null;
  if (typeof module?.convertRecordingToM4A !== 'function') {
    return Promise.reject(new Error('Recording conversion is unavailable in this build.'));
  }
  return module.convertRecordingToM4A(wavPath);
}

export function isNativeVoicePlaybackAvailable(): boolean {
  return ensureInstalled() && typeof globalThis.__mementoCreateVoicePlaybackSession === 'function';
}

export class NativeVoicePlaybackSession {
  private readonly host: NativeVoiceSessionHost;

  constructor(context: AudioContext, options: NativeVoicePlaybackOptions = {}) {
    if (!isNativeVoicePlaybackAvailable() || !globalThis.__mementoCreateVoicePlaybackSession) {
      throw new Error('Native voice playback is unavailable.');
    }
    const destination = context.destination as unknown as { node: unknown };
    this.host = globalThis.__mementoCreateVoicePlaybackSession(
      context.context,
      destination.node,
      {
        ...DEFAULT_OPTIONS,
        ...options,
      },
    );
  }

  start(generation: number, epoch: number): void {
    this.host.start(generation, epoch);
  }

  pushPCM(base64Pcm: string, generation: number, epoch: number, sequence: number): boolean {
    return this.host.pushPCM(base64Pcm, generation, epoch, sequence);
  }

  flushTurn(generation: number, epoch: number): void {
    this.host.flushTurn(generation, epoch);
  }

  interrupt(generation: number, nextEpoch: number): void {
    this.host.interrupt(generation, nextEpoch);
  }

  getSnapshot(): NativeVoicePlaybackSnapshot {
    return this.host.getSnapshot();
  }

  stop(generation: number): void {
    this.host.stop(generation);
  }
}