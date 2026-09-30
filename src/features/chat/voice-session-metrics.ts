export type VoiceMetricSnapshot = {
  connectToOpenMs?: number;
  connectToSetupMs?: number;
  firstOutputToPlaybackMs?: number;
  minQueueDepthMs?: number;
  maxQueueDepthMs?: number;
  minOutputChunkDurationMs?: number;
  maxOutputChunkDurationMs?: number;
  minPlaybackPaceRatio?: number;
  maxPlaybackPaceRatio?: number;
  underruns: number;
  rebuffers: number;
  interruptionToSilenceMs?: number;
  routeChanges: number;
  routeRebuilds: number;
  durationMs: number;
  closeCode?: number;
  closeReason?: string;
};

export class VoiceSessionMetrics {
  private readonly startedAt: number;
  private openedAt?: number;
  private setupAt?: number;
  private firstOutputAt?: number;
  private playbackStartedAt?: number;
  private interruptionAt?: number;
  private silenceAt?: number;
  private minimumQueueDepth?: number;
  private maximumQueueDepth?: number;
  private minimumOutputChunkDuration?: number;
  private maximumOutputChunkDuration?: number;
  private minimumPlaybackPaceRatio?: number;
  private maximumPlaybackPaceRatio?: number;
  private underrunCount = 0;
  private rebufferCount = 0;
  private routeChangeCount = 0;
  private routeRebuildCount = 0;
  private closedAt?: number;
  private closeCode?: number;
  private closeReason?: string;

  constructor(private readonly now: () => number = Date.now) {
    this.startedAt = now();
  }

  markOpen(): void {
    this.openedAt ??= this.now();
  }

  markSetup(): void {
    this.setupAt ??= this.now();
  }

  markFirstOutput(): void {
    this.firstOutputAt ??= this.now();
  }

  markPlaybackStart(): void {
    this.playbackStartedAt ??= this.now();
  }

  observeQueueDepth(depthMs: number): void {
    if (!Number.isFinite(depthMs) || depthMs < 0) return;
    this.minimumQueueDepth = Math.min(this.minimumQueueDepth ?? depthMs, depthMs);
    this.maximumQueueDepth = Math.max(this.maximumQueueDepth ?? depthMs, depthMs);
  }

  markUnderrun(): void {
    this.underrunCount += 1;
    this.rebufferCount += 1;
  }

  observeOutputChunkDuration(durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;
    this.minimumOutputChunkDuration = Math.min(
      this.minimumOutputChunkDuration ?? durationMs,
      durationMs,
    );
    this.maximumOutputChunkDuration = Math.max(
      this.maximumOutputChunkDuration ?? durationMs,
      durationMs,
    );
  }

  observePlaybackPaceRatio(ratio: number): void {
    if (!Number.isFinite(ratio) || ratio <= 0) return;
    this.minimumPlaybackPaceRatio = Math.min(this.minimumPlaybackPaceRatio ?? ratio, ratio);
    this.maximumPlaybackPaceRatio = Math.max(this.maximumPlaybackPaceRatio ?? ratio, ratio);
  }

  markInterruption(): void {
    this.interruptionAt = this.now();
    this.silenceAt = undefined;
  }

  markSilence(): void {
    if (this.interruptionAt !== undefined) this.silenceAt = this.now();
  }

  markRouteChange(): void {
    this.routeChangeCount += 1;
  }

  markRouteRebuild(): void {
    this.routeRebuildCount += 1;
  }

  close(code?: number, reason?: string): void {
    this.closedAt ??= this.now();
    this.closeCode = code;
    this.closeReason = reason?.slice(0, 120);
  }

  snapshot(): VoiceMetricSnapshot {
    const endedAt = this.closedAt ?? this.now();
    return {
      connectToOpenMs:
        this.openedAt === undefined ? undefined : this.openedAt - this.startedAt,
      connectToSetupMs:
        this.setupAt === undefined ? undefined : this.setupAt - this.startedAt,
      firstOutputToPlaybackMs:
        this.firstOutputAt === undefined || this.playbackStartedAt === undefined
          ? undefined
          : this.playbackStartedAt - this.firstOutputAt,
      minQueueDepthMs: this.minimumQueueDepth,
      maxQueueDepthMs: this.maximumQueueDepth,
      minOutputChunkDurationMs: this.minimumOutputChunkDuration,
      maxOutputChunkDurationMs: this.maximumOutputChunkDuration,
      minPlaybackPaceRatio: this.minimumPlaybackPaceRatio,
      maxPlaybackPaceRatio: this.maximumPlaybackPaceRatio,
      underruns: this.underrunCount,
      rebuffers: this.rebufferCount,
      interruptionToSilenceMs:
        this.interruptionAt === undefined || this.silenceAt === undefined
          ? undefined
          : this.silenceAt - this.interruptionAt,
      routeChanges: this.routeChangeCount,
      routeRebuilds: this.routeRebuildCount,
      durationMs: endedAt - this.startedAt,
      closeCode: this.closeCode,
      closeReason: this.closeReason,
    };
  }
}
