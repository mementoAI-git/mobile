export type VoiceQueuedBuffer = {
  id: string;
  durationMs: number;
};

export type VoiceBufferEndedEvent = VoiceQueuedBuffer & {
  isLastBufferInQueue: boolean;
};

export interface VoicePlaybackRuntime {
  createQueue(onBufferEnded: (event: VoiceBufferEndedEvent) => void): void;
  enqueue(base64Pcm: string): VoiceQueuedBuffer;
  start(): void;
  clear(): void;
  stop(): void;
}

export interface VoiceTimerScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(timer: unknown): void;
}

export type VoicePlaybackState = 'idle' | 'prebuffering' | 'playing' | 'stopped';
