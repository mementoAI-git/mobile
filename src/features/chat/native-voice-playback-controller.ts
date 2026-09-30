import type {
  NativeVoicePlaybackSession,
  NativeVoicePlaybackSnapshot,
} from 'react-native-memento-voice';

import type { VoicePlaybackState, VoiceTimerScheduler } from './voice-audio-types';
import { VOICE_MAX_QUEUE_MS } from './voice-playback-controller';
import { VoiceSessionMetrics } from './voice-session-metrics';

const NATIVE_STATE_POLL_MS = 50;
// Deeper than the JS fallback's 180/240 ms: cellular jitter otherwise turns
// each late packet into an audible hole mid-word.
export const NATIVE_VOICE_STARTUP_BUFFER_MS = 240;
export const NATIVE_VOICE_RECOVERY_BUFFER_MS = 360;
const defaultScheduler: VoiceTimerScheduler = {
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: (timer) =>
    globalThis.clearTimeout(timer as ReturnType<typeof globalThis.setTimeout>),
};

export interface NativeVoicePlaybackSessionAdapter {
  start(generation: number, epoch: number): void;
  pushPCM(base64Pcm: string, generation: number, epoch: number, sequence: number): boolean;
  flushTurn(generation: number, epoch: number): void;
  interrupt(generation: number, nextEpoch: number): void;
  getSnapshot(): NativeVoicePlaybackSnapshot;
  stop(generation: number): void;
}

export class NativeVoicePlaybackController {
  state: VoicePlaybackState = 'idle';

  private sequence = 0;
  private pollTimer?: unknown;
  private lastUnderrunCount = 0;
  private lastPlaybackEndTime = 0;

  constructor(
    private readonly session: NativeVoicePlaybackSessionAdapter,
    private readonly generation: number,
    private epoch: number,
    private readonly metrics: VoiceSessionMetrics = new VoiceSessionMetrics(),
    private readonly onStateChange?: (state: VoicePlaybackState) => void,
    private readonly scheduler: VoiceTimerScheduler = defaultScheduler,
  ) {
    this.session.start(generation, epoch);
  }

  enqueue(base64Pcm: string, epoch = this.epoch): boolean {
    if (this.state === 'stopped' || epoch !== this.epoch) return false;
    const accepted = this.session.pushPCM(
      base64Pcm,
      this.generation,
      epoch,
      this.sequence++,
    );
    if (!accepted) return false;

    const durationMs = estimatePcm16DurationMs(base64Pcm, 24_000);
    this.metrics.observeOutputChunkDuration(durationMs);
    this.metrics.markFirstOutput();
    this.setState('prebuffering');
    this.schedulePoll();
    return true;
  }

  interrupt(epoch: number): void {
    if (this.state === 'stopped' || epoch <= this.epoch) return;
    this.metrics.markInterruption();
    this.session.interrupt(this.generation, epoch);
    this.epoch = epoch;
    this.sequence = 0;
    this.setState('idle');
    this.lastPlaybackEndTime = Date.now();
    this.metrics.markSilence();
    this.cancelPoll();
  }

  finishTurn(): void {
    if (this.state === 'stopped') return;
    this.session.flushTurn(this.generation, this.epoch);
    this.schedulePoll();
  }

  stop(): void {
    if (this.state === 'stopped') return;
    this.cancelPoll();
    this.session.stop(this.generation);
    this.setState('stopped');
    this.lastPlaybackEndTime = Date.now();
  }

  getQueueDepthMs(): number {
    return this.session.getSnapshot().bufferedMs;
  }

  isPlaying(): boolean {
    const nativeState = this.session.getSnapshot().state;
    return nativeState === 'playing' || nativeState === 'draining';
  }

  isAudible(hangoverMs = 350): boolean {
    const snapshot = this.session.getSnapshot();
    if (snapshot.isAudible || snapshot.state === 'priming' || snapshot.state === 'recovering') {
      return true;
    }
    return this.lastPlaybackEndTime > 0 && Date.now() - this.lastPlaybackEndTime < hangoverMs;
  }

  getEpoch(): number {
    return this.epoch;
  }

  private schedulePoll(): void {
    if (this.pollTimer !== undefined || this.state === 'stopped') return;
    this.pollTimer = this.scheduler.setTimeout(() => {
      this.pollTimer = undefined;
      const snapshot = this.session.getSnapshot();
      this.metrics.observeQueueDepth(snapshot.bufferedMs);
      while (this.lastUnderrunCount < snapshot.underrunCount) {
        this.metrics.markUnderrun();
        this.lastUnderrunCount += 1;
      }

      if (snapshot.state === 'playing' || snapshot.state === 'draining') {
        this.metrics.markPlaybackStart();
        this.setState('playing');
      } else if (snapshot.state === 'priming' || snapshot.state === 'recovering') {
        this.setState('prebuffering');
      } else if (snapshot.state === 'idle') {
        if (this.state === 'playing') this.lastPlaybackEndTime = Date.now();
        this.setState('idle');
      }

      if (snapshot.state !== 'idle' && snapshot.state !== 'stopped') this.schedulePoll();
    }, NATIVE_STATE_POLL_MS);
  }

  private cancelPoll(): void {
    if (this.pollTimer === undefined) return;
    this.scheduler.clearTimeout(this.pollTimer);
    this.pollTimer = undefined;
  }

  private setState(state: VoicePlaybackState): void {
    if (this.state === state) return;
    this.state = state;
    this.onStateChange?.(state);
  }
}

export function createNativeVoicePlaybackSession(
  context: unknown,
): NativeVoicePlaybackSessionAdapter | undefined {
  if (process.env.EXPO_PUBLIC_NATIVE_VOICE_PLAYBACK !== 'true') return undefined;
  try {
    const voiceModule = require('react-native-memento-voice') as typeof import('react-native-memento-voice');
    if (!voiceModule.isNativeVoicePlaybackAvailable()) return undefined;
    return new voiceModule.NativeVoicePlaybackSession(
      context as ConstructorParameters<typeof NativeVoicePlaybackSession>[0],
      {
        sourceSampleRate: 24_000,
        startupBufferMs: NATIVE_VOICE_STARTUP_BUFFER_MS,
        recoveryBufferMs: NATIVE_VOICE_RECOVERY_BUFFER_MS,
        maxBufferedMs: VOICE_MAX_QUEUE_MS,
      },
    );
  } catch {
    return undefined;
  }
}

function estimatePcm16DurationMs(base64Pcm: string, sampleRate: number): number {
  const padding = base64Pcm.endsWith('==') ? 2 : base64Pcm.endsWith('=') ? 1 : 0;
  const byteLength = Math.max(0, Math.floor((base64Pcm.length * 3) / 4) - padding);
  return (Math.floor(byteLength / 2) / sampleRate) * 1_000;
}