import type {
  VoiceBufferEndedEvent,
  VoicePlaybackRuntime,
  VoiceQueuedBuffer,
} from './voice-audio-types';
import {
  createNativeVoicePlaybackSession,
  NativeVoicePlaybackController,
} from './native-voice-playback-controller';
import { VoicePlaybackController } from './voice-playback-controller';
import {
  float32ToPcm16Base64,
  pcm16Base64ToFloat32,
  resampleLinear,
} from './voice-pcm';
import { VoiceSessionMetrics, type VoiceMetricSnapshot } from './voice-session-metrics';

const INPUT_SAMPLE_RATE = 16_000;
const INPUT_BUFFER_FRAMES = 1_600;
const OUTPUT_SAMPLE_RATE = 24_000;
const FALLBACK_PLAYBACK_SAMPLE_RATE = 48_000;

export const VOICE_SESSION_OPTIONS = {
  iosCategory: 'playAndRecord' as const,
  iosMode: 'voiceChat' as const,
  iosOptions: ['defaultToSpeaker', 'allowBluetoothHFP'] as const,
};

export function isHeadphonesRoute(
  outputs?: Array<{ name?: string; category?: string }>,
): boolean {
  if (!outputs || outputs.length === 0) return false;
  return outputs.some((output) => {
    const category = (output.category ?? '').toLowerCase();
    const name = (output.name ?? '').toLowerCase();
    const isHeadphoneCategory =
      category.includes('headphone') ||
      category.includes('headset') ||
      category.includes('bluetooth') ||
      category.includes('airplay') ||
      category.includes('lineout') ||
      category.includes('usb') ||
      category.includes('hearingaid');
    const isHeadphoneName =
      name.includes('headphone') ||
      name.includes('headset') ||
      name.includes('airpods') ||
      name.includes('earbuds') ||
      name.includes('buds') ||
      name.includes('bluetooth');
    return isHeadphoneCategory || isHeadphoneName;
  });
}

export type VoiceCaptureEvent = {
  buffer: { getChannelData(channel: number): Float32Array };
  numFrames: number;
};

export interface VoiceAudioRecorderAdapter {
  onAudioReady(
    options: { sampleRate: number; bufferLength: number; channelCount: number },
    listener: (event: VoiceCaptureEvent) => void,
  ): void;
  clearOnAudioReady(): void;
  onError(listener: (message: string) => void): void;
  clearOnError(): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface VoiceAudioQueueAdapter {
  connect(): void;
  setOnBufferEnded(listener: (event: VoiceBufferEndedEvent) => void): void;
  enqueue(samples: Float32Array, sampleRate: number): VoiceQueuedBuffer;
  start(): void;
  clear(): void;
  stop(): void;
}

export interface VoiceAudioContextAdapter {
  readonly nativeContext?: unknown;
  resume(): Promise<void>;
  createQueue(): VoiceAudioQueueAdapter;
  close(): Promise<void>;
}

export interface VoiceNativeSubscription {
  remove(): void;
}

export interface VoiceAudioNativeAdapter {
  setSessionOptions(options: typeof VOICE_SESSION_OPTIONS): void;
  setSessionActive(active: boolean): Promise<void>;
  getPreferredSampleRate(): number;
  createContext(sampleRate: number): VoiceAudioContextAdapter;
  createRecorder(options: {
    iosVoiceProcessing: boolean;
    androidInputPreset: 'voiceCommunication';
  }): VoiceAudioRecorderAdapter;
  addRouteChangeListener(listener: () => void): VoiceNativeSubscription;
  addAppStateListener(listener: (state: string) => void): VoiceNativeSubscription;
  hasInput(): Promise<boolean>;
  isHeadphonesConnected?(): Promise<boolean>;
  requestRecordingPermission(): Promise<'Undetermined' | 'Denied' | 'Granted'>;
}

export type VoiceAudioEngineSnapshot = VoiceMetricSnapshot & {
  captureDurationAnomalies: number;
  modelOutputSampleRate: number;
  playbackContextSampleRate?: number;
};

export type VoiceAudioEngineOptions = {
  native?: VoiceAudioNativeAdapter;
  metrics?: VoiceSessionMetrics;
  onFatalError?: (error: Error) => void;
  onPlaybackStateChange?: (
    state: 'idle' | 'prebuffering' | 'playing' | 'stopped',
  ) => void;
};

export class QueuePlaybackRuntime implements VoicePlaybackRuntime {
  private queue?: VoiceAudioQueueAdapter;

  constructor(
    private readonly context: VoiceAudioContextAdapter,
    private readonly playbackSampleRate: number,
  ) {}

  createQueue(onBufferEnded: (event: VoiceBufferEndedEvent) => void): void {
    this.queue = this.context.createQueue();
    this.queue.connect();
    this.queue.setOnBufferEnded(onBufferEnded);
  }

  enqueue(base64Pcm: string): VoiceQueuedBuffer {
    const decoded = pcm16Base64ToFloat32(base64Pcm);
    if (!decoded.ok) throw new Error('Received malformed PCM16 audio from voice model.');
    if (!this.queue) throw new Error('Voice playback queue is unavailable.');
    const playbackSamples = resampleLinear(
      decoded.samples,
      OUTPUT_SAMPLE_RATE,
      this.playbackSampleRate,
    );
    return this.queue.enqueue(playbackSamples, this.playbackSampleRate);
  }

  start(): void {
    this.queue?.start();
  }

  clear(): void {
    this.queue?.clear();
  }

  stop(): void {
    this.queue?.stop();
    this.queue = undefined;
  }
}

export class VoiceAudioEngine {
  private readonly native: VoiceAudioNativeAdapter;
  private readonly metrics: VoiceSessionMetrics;
  private readonly onFatalError?: (error: Error) => void;
  private readonly onPlaybackStateChange?: (
    state: 'idle' | 'prebuffering' | 'playing' | 'stopped',
  ) => void;
  private context?: VoiceAudioContextAdapter;
  private recorder?: VoiceAudioRecorderAdapter;
  private playback?: VoicePlaybackController | NativeVoicePlaybackController;
  private subscriptions: VoiceNativeSubscription[] = [];
  private stopPromise?: Promise<void>;
  private started = false;
  private fatalReported = false;
  private captureDurationAnomalies = 0;
  private epoch = 1;
  private isHeadphones = false;
  private greetingShieldActive = false;
  private playbackContextSampleRate?: number;
  private playbackGeneration = 0;
  private routeChangePromise: Promise<void> = Promise.resolve();

  constructor(options: VoiceAudioEngineOptions = {}) {
    this.native = options.native ?? createNativeVoiceAudioAdapter();
    this.metrics = options.metrics ?? new VoiceSessionMetrics();
    this.onFatalError = options.onFatalError;
    this.onPlaybackStateChange = options.onPlaybackStateChange;
  }

  async requestRecordingPermission(): Promise<{
    granted: boolean;
    status: string;
    canAskAgain: boolean;
  }> {
    const status = await this.native.requestRecordingPermission();
    return {
      granted: status === 'Granted',
      status: status.toLowerCase(),
      canAskAgain: status === 'Undetermined',
    };
  }

  markConnectionOpen(): void {
    this.metrics.markOpen();
  }

  markSetupComplete(): void {
    this.metrics.markSetup();
  }

  isHeadphonesActive(): boolean {
    return this.isHeadphones;
  }

  isPlaying(): boolean {
    return this.playback?.isPlaying() ?? false;
  }

  isAudible(hangoverMs?: number): boolean {
    return this.playback?.isAudible(hangoverMs) ?? false;
  }

  getEpoch(): number {
    return this.epoch;
  }

  nextEpoch(): number {
    this.epoch += 1;
    return this.epoch;
  }

  async start(onInput: (base64Pcm: string) => void): Promise<void> {
    if (this.started) return;

    this.native.setSessionOptions(VOICE_SESSION_OPTIONS);
    await this.native.setSessionActive(true);

    try {
      this.recorder = this.native.createRecorder({
        iosVoiceProcessing: true,
        androidInputPreset: 'voiceCommunication',
      });
      const preferredSampleRate = this.native.getPreferredSampleRate();
      this.playbackContextSampleRate =
        Number.isFinite(preferredSampleRate) && preferredSampleRate > 0
          ? preferredSampleRate
          : FALLBACK_PLAYBACK_SAMPLE_RATE;
      await this.createPlayback(this.playbackContextSampleRate);

      this.subscriptions = [
        this.native.addRouteChangeListener(() => {
          this.routeChangePromise = this.routeChangePromise
            .then(() => this.handleRouteChange())
            .catch((error) => this.fail(asError(error)));
        }),
        this.native.addAppStateListener((state) => void this.handleAppState(state)),
      ];

      await this.updateAudioRoute();

      this.recorder.onAudioReady(
        {
          sampleRate: INPUT_SAMPLE_RATE,
          bufferLength: INPUT_BUFFER_FRAMES,
          channelCount: 1,
        },
        (event) => {
          // Protect the initial greeting window: the model is speaking and the mic
          // would capture its own echo. Once playback goes idle the shield disarms
          // and we stream all frames unconditionally — server-side VAD handles the rest.
          if (this.greetingShieldActive) return;

          // When audio is outputting through the device loudspeaker (no headphones connected),
          // suppress mic uplink while playback is active/audible to eliminate acoustic echo feedback
          // that causes the server VAD to falsely detect user speech and cut the AI response.
          // When headphones are connected, full duplex is safe (no acoustic speaker feedback).
          if (!this.isHeadphones && this.isAudible(200)) return;

          const channel = event.buffer.getChannelData(0);
          const actualFrames = Math.min(event.numFrames, channel.length);
          if (actualFrames !== INPUT_BUFFER_FRAMES) this.captureDurationAnomalies += 1;
          onInput(float32ToPcm16Base64(channel.subarray(0, actualFrames)));
        },
      );
      this.recorder.onError((message) => {
        void this.fail(new Error(message || 'The microphone stopped unexpectedly.'));
      });
      await this.recorder.start();
      this.started = true;
    } catch (error) {
      await this.fail(asError(error));
      throw error;
    }
  }

  armGreetingShield(): void {
    this.greetingShieldActive = true;
  }

  disarmGreetingShield(): void {
    this.greetingShieldActive = false;
  }

  enqueueOutput(base64Pcm: string, epoch: number): boolean {
    return this.playback?.enqueue(base64Pcm, epoch) ?? false;
  }

  interruptOutput(epoch: number): void {
    this.epoch = Math.max(this.epoch, epoch);
    this.playback?.interrupt(this.epoch);
  }

  finishOutputTurn(options?: { forceDisarm?: boolean }): void {
    this.playback?.finishTurn();
    if (options?.forceDisarm || !this.playback?.isPlaying()) {
      this.greetingShieldActive = false;
    }
  }

  async handleAppState(state: string): Promise<void> {
    if (state === 'background') {
      await this.fail(new Error('Voice mode ended when Memento moved to the background.'));
    }
  }

  async stop(): Promise<void> {
    return this.stopWithReason('stopped');
  }

  snapshot(): VoiceAudioEngineSnapshot {
    return {
      ...this.metrics.snapshot(),
      captureDurationAnomalies: this.captureDurationAnomalies,
      modelOutputSampleRate: OUTPUT_SAMPLE_RATE,
      playbackContextSampleRate: this.playbackContextSampleRate,
    };
  }

  private async updateAudioRoute(): Promise<void> {
    if (this.native.isHeadphonesConnected) {
      try {
        this.isHeadphones = await this.native.isHeadphonesConnected();
      } catch {
        this.isHeadphones = false;
      }
    }
  }

  private async handleRouteChange(): Promise<void> {
    this.metrics.markRouteChange();
    await this.updateAudioRoute();
    try {
      if (!(await this.native.hasInput())) {
        await this.fail(new Error('Voice mode lost its audio input route.'));
        return;
      }

      const preferredSampleRate = this.native.getPreferredSampleRate();
      if (
        Number.isFinite(preferredSampleRate) &&
        preferredSampleRate > 0 &&
        preferredSampleRate !== this.playbackContextSampleRate
      ) {
        await this.rebuildPlayback(preferredSampleRate);
      }
    } catch (error) {
      throw asError(error);
    }
  }

  private async createPlayback(sampleRate: number): Promise<void> {
    const context = this.native.createContext(sampleRate);
    await context.resume();
    this.context = context;
    this.playbackContextSampleRate = sampleRate;
    this.playbackGeneration += 1;
    const onStateChange = (
      state: 'idle' | 'prebuffering' | 'playing' | 'stopped',
    ) => {
      if (state === 'idle' || state === 'stopped') {
        this.greetingShieldActive = false;
      }
      this.onPlaybackStateChange?.(state);
    };
    const nativeSession = context.nativeContext
      ? createNativeVoicePlaybackSession(context.nativeContext)
      : undefined;
    this.playback = nativeSession
      ? new NativeVoicePlaybackController(
          nativeSession,
          this.playbackGeneration,
          this.epoch,
          this.metrics,
          onStateChange,
        )
      : new VoicePlaybackController(
          new QueuePlaybackRuntime(context, sampleRate),
          undefined,
          this.metrics,
          onStateChange,
          Date.now,
          this.epoch,
        );
  }

  private async rebuildPlayback(sampleRate: number): Promise<void> {
    this.playback?.stop();
    this.playback = undefined;
    const previousContext = this.context;
    this.context = undefined;
    if (previousContext) await previousContext.close();
    await this.createPlayback(sampleRate);
    this.metrics.markRouteRebuild();
  }

  private async fail(error: Error): Promise<void> {
    if (!this.fatalReported) {
      this.fatalReported = true;
      this.onFatalError?.(error);
    }
    await this.stopWithReason(error.message);
  }

  private stopWithReason(reason: string): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    this.stopPromise = (async () => {
      this.subscriptions.forEach((subscription) => subscription.remove());
      this.subscriptions = [];

      const recorder = this.recorder;
      this.recorder = undefined;
      if (recorder) {
        recorder.clearOnAudioReady();
        recorder.clearOnError();
        await recorder.stop();
      }

      this.playback?.stop();
      this.playback = undefined;

      const context = this.context;
      this.context = undefined;
      if (context) await context.close();

      await this.native.setSessionActive(false);
      this.started = false;
      this.metrics.close(undefined, reason);
    })();
    return this.stopPromise;
  }
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function createNativeVoiceAudioAdapter(): VoiceAudioNativeAdapter {
  const audioApi = require('react-native-audio-api') as typeof import('react-native-audio-api');
  const { AppState } = require('react-native') as typeof import('react-native');

  class NativeQueue implements VoiceAudioQueueAdapter {
    private readonly node: ReturnType<InstanceType<typeof audioApi.AudioContext>['createBufferQueueSource']>;
    private readonly durations = new Map<string, number>();

    constructor(private readonly context: InstanceType<typeof audioApi.AudioContext>) {
      this.node = context.createBufferQueueSource({ pitchCorrection: false });
    }

    connect(): void {
      this.node.connect(this.context.destination);
    }

    setOnBufferEnded(listener: (event: VoiceBufferEndedEvent) => void): void {
      this.node.onbufferended = (event) => {
        const durationMs = this.durations.get(event.bufferId) ?? 0;
        this.durations.delete(event.bufferId);
        listener({
          id: event.bufferId,
          durationMs,
          isLastBufferInQueue: event.isLastBufferInQueue,
        });
      };
    }

    enqueue(samples: Float32Array, sampleRate: number): VoiceQueuedBuffer {
      const buffer = this.context.createBuffer(1, samples.length, sampleRate);
      buffer.copyToChannel(samples as unknown as Float32Array<ArrayBuffer>, 0);
      const id = this.node.enqueueBuffer(buffer);
      const durationMs = (samples.length / sampleRate) * 1_000;
      this.durations.set(id, durationMs);
      return { id, durationMs };
    }

    start(): void {
      this.node.start();
    }

    clear(): void {
      this.node.clearBuffers();
      this.durations.clear();
    }

    stop(): void {
      this.node.onbufferended = null;
      this.node.stop();
      this.durations.clear();
    }
  }

  return {
    setSessionOptions: (options) =>
      audioApi.AudioManager.setAudioSessionOptions({
        ...options,
        iosOptions: [...options.iosOptions],
      }),
    setSessionActive: (active) => audioApi.AudioManager.setAudioSessionActivity(active),
    getPreferredSampleRate: () => audioApi.AudioManager.getDevicePreferredSampleRate(),
    createContext: (sampleRate) => {
      const context = new audioApi.AudioContext({ sampleRate });
      return {
        nativeContext: context,
        resume: () => context.resume(),
        createQueue: () => new NativeQueue(context),
        close: () => context.close(),
      };
    },
    createRecorder: (options) => {
      const recorder = new audioApi.AudioRecorder(options);
      return {
        onAudioReady: (callbackOptions, listener) => {
          const result = recorder.onAudioReady(callbackOptions, listener);
          if (result.status === 'error') throw new Error(result.message);
        },
        clearOnAudioReady: () => recorder.clearOnAudioReady(),
        onError: (listener) => recorder.onError((event) => listener(event.message)),
        clearOnError: () => recorder.clearOnError(),
        start: async () => {
          const result = await recorder.start();
          if (result.status === 'error') throw new Error(result.message);
        },
        stop: async () => {
          const result = await recorder.stop();
          if (result.status === 'error') throw new Error(result.message);
        },
      };
    },
    addRouteChangeListener: (listener) =>
      audioApi.AudioManager.addSystemEventListener('routeChange', listener),
    addAppStateListener: (listener) => AppState.addEventListener('change', listener),
    hasInput: async () => {
      const devices = await audioApi.AudioManager.getDevicesInfo();
      return devices.availableInputs.length > 0 || devices.currentInputs.length > 0;
    },
    isHeadphonesConnected: async () => {
      try {
        const devices = await audioApi.AudioManager.getDevicesInfo();
        return isHeadphonesRoute(devices.currentOutputs);
      } catch {
        return false;
      }
    },
    requestRecordingPermission: () => audioApi.AudioManager.requestRecordingPermissions(),
  };
}
