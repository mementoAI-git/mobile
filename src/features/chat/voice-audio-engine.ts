import type {
  VoiceBufferEndedEvent,
  VoicePlaybackRuntime,
  VoiceQueuedBuffer,
} from './voice-audio-types';
import { VoicePlaybackController } from './voice-playback-controller';
import { float32ToPcm16Base64, pcm16Base64ToFloat32 } from './voice-pcm';
import { VoiceSessionMetrics, type VoiceMetricSnapshot } from './voice-session-metrics';

const INPUT_SAMPLE_RATE = 16_000;
const INPUT_BUFFER_FRAMES = 1_600;
const OUTPUT_SAMPLE_RATE = 24_000;

export const VOICE_SESSION_OPTIONS = {
  iosCategory: 'playAndRecord' as const,
  iosMode: 'voiceChat' as const,
  iosOptions: ['defaultToSpeaker', 'allowBluetoothHFP'] as const,
};

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
  createContext(sampleRate: number): VoiceAudioContextAdapter;
  createRecorder(options: {
    iosVoiceProcessing: boolean;
    androidInputPreset: 'voiceCommunication';
  }): VoiceAudioRecorderAdapter;
  addRouteChangeListener(listener: () => void): VoiceNativeSubscription;
  addAppStateListener(listener: (state: string) => void): VoiceNativeSubscription;
  hasInput(): Promise<boolean>;
  requestRecordingPermission(): Promise<'Undetermined' | 'Denied' | 'Granted'>;
}

export type VoiceAudioEngineSnapshot = VoiceMetricSnapshot & {
  captureDurationAnomalies: number;
};

class QueuePlaybackRuntime implements VoicePlaybackRuntime {
  private queue?: VoiceAudioQueueAdapter;

  constructor(private readonly context: VoiceAudioContextAdapter) {}

  createQueue(onBufferEnded: (event: VoiceBufferEndedEvent) => void): void {
    this.queue = this.context.createQueue();
    this.queue.connect();
    this.queue.setOnBufferEnded(onBufferEnded);
  }

  enqueue(base64Pcm: string): VoiceQueuedBuffer {
    const decoded = pcm16Base64ToFloat32(base64Pcm);
    if (!decoded.ok) throw new Error('Received malformed PCM16 audio from voice model.');
    if (!this.queue) throw new Error('Voice playback queue is unavailable.');
    return this.queue.enqueue(decoded.samples, OUTPUT_SAMPLE_RATE);
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
  private context?: VoiceAudioContextAdapter;
  private recorder?: VoiceAudioRecorderAdapter;
  private playback?: VoicePlaybackController;
  private subscriptions: VoiceNativeSubscription[] = [];
  private stopPromise?: Promise<void>;
  private started = false;
  private fatalReported = false;
  private captureDurationAnomalies = 0;
  private readonly onPlaybackStateChange?: (state: 'idle' | 'prebuffering' | 'playing' | 'stopped') => void;

  constructor(options: {
    native?: VoiceAudioNativeAdapter;
    metrics?: VoiceSessionMetrics;
    onFatalError?: (error: Error) => void;
    onPlaybackStateChange?: (
      state: 'idle' | 'prebuffering' | 'playing' | 'stopped',
    ) => void;
  } = {}) {
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

  async start(onInput: (base64Pcm: string) => void): Promise<void> {
    if (this.started) return;

    this.native.setSessionOptions(VOICE_SESSION_OPTIONS);
    await this.native.setSessionActive(true);

    try {
      this.context = this.native.createContext(OUTPUT_SAMPLE_RATE);
      await this.context.resume();
      this.recorder = this.native.createRecorder({
        iosVoiceProcessing: true,
        androidInputPreset: 'voiceCommunication',
      });
      this.playback = new VoicePlaybackController(
        new QueuePlaybackRuntime(this.context),
        undefined,
        this.metrics,
        this.onPlaybackStateChange,
      );

      this.subscriptions = [
        this.native.addRouteChangeListener(() => void this.handleRouteChange()),
        this.native.addAppStateListener((state) => void this.handleAppState(state)),
      ];

      this.recorder.onAudioReady(
        {
          sampleRate: INPUT_SAMPLE_RATE,
          bufferLength: INPUT_BUFFER_FRAMES,
          channelCount: 1,
        },
        (event) => {
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

  enqueueOutput(base64Pcm: string, epoch: number): boolean {
    return this.playback?.enqueue(base64Pcm, epoch) ?? false;
  }

  interruptOutput(epoch: number): void {
    this.playback?.interrupt(epoch);
  }

  finishOutputTurn(): void {
    this.playback?.finishTurn();
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
    };
  }

  private async handleRouteChange(): Promise<void> {
    this.metrics.markRouteChange();
    try {
      if (!(await this.native.hasInput())) {
        await this.fail(new Error('Voice mode lost its audio input route.'));
      }
    } catch (error) {
      await this.fail(asError(error));
    }
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
      const ownedSamples = new Float32Array(samples.length);
      ownedSamples.set(samples);
      buffer.copyToChannel(ownedSamples, 0);
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
    createContext: (sampleRate) => {
      const context = new audioApi.AudioContext({ sampleRate });
      return {
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
    requestRecordingPermission: () => audioApi.AudioManager.requestRecordingPermissions(),
  };
}
