import type {
  VoiceBufferEndedEvent,
  VoicePlaybackRuntime,
  VoicePlaybackState,
  VoiceQueuedBuffer,
  VoiceTimerScheduler,
} from './voice-audio-types';
import { VoiceSessionMetrics } from './voice-session-metrics';

export const VOICE_PREBUFFER_MS = 120;
export const VOICE_STARTUP_DEADLINE_MS = 180;

const defaultScheduler: VoiceTimerScheduler = {
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: (timer) =>
    globalThis.clearTimeout(timer as ReturnType<typeof globalThis.setTimeout>),
};

export class VoicePlaybackController {
  state: VoicePlaybackState = 'idle';

  private epoch = 1;
  private queueDepthMs = 0;
  private activeTurn = false;
  private queueStarted = false;
  private startupTimer?: unknown;
  private readonly queuedBuffers = new Map<string, VoiceQueuedBuffer>();

  constructor(
    private readonly runtime: VoicePlaybackRuntime,
    private readonly scheduler: VoiceTimerScheduler = defaultScheduler,
    private readonly metrics: VoiceSessionMetrics = new VoiceSessionMetrics(),
    private readonly onStateChange?: (state: VoicePlaybackState) => void,
  ) {
    this.createQueue();
  }

  enqueue(base64Pcm: string, epoch = this.epoch): boolean {
    if (this.state === 'stopped' || epoch !== this.epoch) return false;

    const buffer = this.runtime.enqueue(base64Pcm);
    if (!Number.isFinite(buffer.durationMs) || buffer.durationMs <= 0) return false;

    this.queuedBuffers.set(buffer.id, buffer);
    this.queueDepthMs += buffer.durationMs;
    this.metrics.markFirstOutput();
    this.metrics.observeQueueDepth(this.queueDepthMs);
    this.activeTurn = true;

    if (this.state !== 'playing') {
      this.setState('prebuffering');
      if (this.queueDepthMs >= VOICE_PREBUFFER_MS) {
        this.beginPlayback();
      } else {
        this.scheduleStartupDeadline();
      }
    }

    return true;
  }

  interrupt(epoch: number): void {
    if (this.state === 'stopped' || epoch <= this.epoch) return;

    this.cancelStartupDeadline();
    this.metrics.markInterruption();
    this.runtime.clear();
    this.runtime.stop();
    this.epoch = epoch;
    this.resetQueueState();
    this.setState('idle');
    this.createQueue();
    this.metrics.markSilence();
  }

  finishTurn(): void {
    if (this.state === 'stopped') return;
    this.activeTurn = false;
    this.cancelStartupDeadline();
    if (this.queueDepthMs > 0 && this.state === 'prebuffering') {
      this.beginPlayback();
    } else if (this.queueDepthMs === 0) {
      this.setState('idle');
    }
  }

  stop(): void {
    if (this.state === 'stopped') return;
    this.cancelStartupDeadline();
    this.runtime.clear();
    this.runtime.stop();
    this.resetQueueState();
    this.setState('stopped');
  }

  getQueueDepthMs(): number {
    return this.queueDepthMs;
  }

  private createQueue(): void {
    this.runtime.createQueue((event) => this.handleBufferEnded(event));
  }

  private handleBufferEnded(event: VoiceBufferEndedEvent): void {
    const buffer = this.queuedBuffers.get(event.id);
    if (!buffer) return;

    this.queuedBuffers.delete(event.id);
    this.queueDepthMs = Math.max(0, this.queueDepthMs - buffer.durationMs);
    this.metrics.observeQueueDepth(this.queueDepthMs);

    if (!event.isLastBufferInQueue && this.queueDepthMs > 0) return;
    if (this.queueDepthMs > 0) return;

    if (this.activeTurn && this.state === 'playing') {
      this.metrics.markUnderrun();
      this.setState('prebuffering');
    } else if (!this.activeTurn) {
      this.setState('idle');
    }
  }

  private scheduleStartupDeadline(): void {
    if (this.startupTimer !== undefined) return;
    this.startupTimer = this.scheduler.setTimeout(() => {
      this.startupTimer = undefined;
      if (this.state === 'prebuffering' && this.queueDepthMs > 0) {
        this.beginPlayback();
      }
    }, VOICE_STARTUP_DEADLINE_MS);
  }

  private cancelStartupDeadline(): void {
    if (this.startupTimer === undefined) return;
    this.scheduler.clearTimeout(this.startupTimer);
    this.startupTimer = undefined;
  }

  private beginPlayback(): void {
    if (this.state === 'stopped' || this.queueDepthMs <= 0) return;
    this.cancelStartupDeadline();
    if (!this.queueStarted) {
      this.runtime.start();
      this.queueStarted = true;
    }
    this.metrics.markPlaybackStart();
    this.setState('playing');
  }

  private resetQueueState(): void {
    this.queueDepthMs = 0;
    this.activeTurn = false;
    this.queueStarted = false;
    this.queuedBuffers.clear();
  }

  private setState(state: VoicePlaybackState): void {
    if (this.state === state) return;
    this.state = state;
    this.onStateChange?.(state);
  }
}
