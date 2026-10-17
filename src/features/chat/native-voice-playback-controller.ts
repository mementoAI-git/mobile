import type {
  NativeVoicePlaybackSession,
  NativeVoicePlaybackSnapshot,
} from 'react-native-memento-voice';

import type { VoicePlaybackState, VoiceTimerScheduler } from './voice-audio-types';
import { VOICE_MAX_QUEUE_MS } from './voice-playback-controller';
import { VoiceSessionMetrics } from './voice-session-metrics';
import { logger } from '@/lib/logger';

export const NATIVE_STATE_POLL_MS = 50;
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

/**
 * An underrun this long after Gemini's last audio chunk means the player was
 * waiting for audio, not failing to play audio it had.
 */
export const VOICE_UNDERRUN_AUDIO_WAIT_MS = 150;

export class NativeVoicePlaybackController {
  state: VoicePlaybackState = 'idle';

  private sequence = 0;
  private pollTimer?: unknown;
  private lastUnderrunCount = 0;
  private lastPlaybackEndTime = 0;
  private finalSnapshot?: NativeVoicePlaybackSnapshot;
  // Why playback ran dry, for the call report: Gemini's audio had stopped
  // arriving (network or the model), or it had arrived and something else
  // (often the app's JavaScript thread being busy) kept it from playing.
  private lastChunkAt = 0;
  private pollDueAt = 0;
  private maxChunkGapMs = 0;
  private maxJsStallMs = 0;
  private underrunsWaitingForAudio = 0;
  private underrunsWithAudio = 0;
  // Dev trace of each reply's start: how long the player waited after
  // Gemini's first chunk, and how much audio had arrived by then.
  private primeStartedAt = 0;
  private primeAudioMs = 0;
  private primeChunks = 0;
  /** Output sample rate of the native context, used to convert concealed frames to ms. */
  targetSampleRate?: number;

  constructor(
    private readonly session: NativeVoicePlaybackSessionAdapter,
    private readonly generation: number,
    private epoch: number,
    private readonly metrics: VoiceSessionMetrics = new VoiceSessionMetrics(),
    private readonly onStateChange?: (state: VoicePlaybackState) => void,
    private readonly scheduler: VoiceTimerScheduler = defaultScheduler,
    private readonly now: () => number = Date.now,
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

    const at = this.now();
    // Gaps between chunks inside a reply: a long one means Gemini's audio
    // stalled on the way.
    if (this.lastChunkAt > 0 && this.state !== 'idle') {
      this.maxChunkGapMs = Math.max(this.maxChunkGapMs, at - this.lastChunkAt);
    }
    this.lastChunkAt = at;

    const durationMs = estimatePcm16DurationMs(base64Pcm, 24_000);
    this.metrics.observeOutputChunkDuration(durationMs);
    this.metrics.markFirstOutput();
    // Native render state is authoritative and the poll mirrors it. A chunk
    // only starts priming from idle; mid-response chunks must not flip a
    // playing stream back to prebuffering (that churned isAiSpeaking per chunk).
    if (this.state === 'idle') {
      this.primeStartedAt = at;
      this.primeAudioMs = 0;
      this.primeChunks = 0;
      this.setState('prebuffering');
    }
    if (this.primeStartedAt > 0) {
      this.primeAudioMs += durationMs;
      this.primeChunks += 1;
    }
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

  /** The native session's own state (priming/recovering count as audible). */
  nativeState(): string {
    return this.session.getSnapshot().state;
  }

  finishTurn(): void {
    if (this.state === 'stopped') return;
    this.session.flushTurn(this.generation, this.epoch);
    this.schedulePoll();
  }

  getStats(): {
    adaptiveExtraMs?: number;
    concealedMs?: number;
    malformedChunks: number;
    underrunsWaitingForAudio: number;
    underrunsWithAudio: number;
    maxChunkGapMs: number;
    maxJsStallMs: number;
  } {
    const snapshot = this.finalSnapshot ?? this.session.getSnapshot();
    return {
      underrunsWaitingForAudio: this.underrunsWaitingForAudio,
      underrunsWithAudio: this.underrunsWithAudio,
      maxChunkGapMs: this.maxChunkGapMs,
      maxJsStallMs: this.maxJsStallMs,
      adaptiveExtraMs: snapshot.adaptiveExtraMs,
      concealedMs:
        snapshot.concealedFrames === undefined || !this.targetSampleRate
          ? undefined
          : Math.round((snapshot.concealedFrames / this.targetSampleRate) * 1_000),
      malformedChunks: snapshot.malformedChunkCount,
    };
  }

  stop(): void {
    if (this.state === 'stopped') return;
    this.cancelPoll();
    this.finalSnapshot = this.session.getSnapshot();
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
    this.pollDueAt = this.now() + NATIVE_STATE_POLL_MS;
    this.pollTimer = this.scheduler.setTimeout(() => {
      this.pollTimer = undefined;
      const at = this.now();
      // A late poll means the JavaScript thread was busy: it was not handing
      // Gemini's audio to the player either.
      this.maxJsStallMs = Math.max(this.maxJsStallMs, at - this.pollDueAt);
      const snapshot = this.session.getSnapshot();
      this.metrics.observeQueueDepth(snapshot.bufferedMs);
      while (this.lastUnderrunCount < snapshot.underrunCount) {
        this.metrics.markUnderrun();
        this.lastUnderrunCount += 1;
        if (at - this.lastChunkAt >= VOICE_UNDERRUN_AUDIO_WAIT_MS) this.underrunsWaitingForAudio += 1;
        else this.underrunsWithAudio += 1;
      }

      if (snapshot.state === 'playing' || snapshot.state === 'draining') {
        this.metrics.markPlaybackStart();
        if (this.primeStartedAt > 0) {
          if (__DEV__) {
            logger.runtime('[VoicePlayback] reply started', {
              waitedMs: at - this.primeStartedAt,
              arrivedMs: Math.round(this.primeAudioMs),
              chunks: this.primeChunks,
              bufferedMs: snapshot.bufferedMs,
              adaptiveExtraMs: snapshot.adaptiveExtraMs,
            });
          }
          this.primeStartedAt = 0;
        }
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