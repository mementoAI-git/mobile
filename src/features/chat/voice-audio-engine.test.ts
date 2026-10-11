import { describe, expect, test } from 'bun:test';

import type { VoiceBufferEndedEvent, VoiceQueuedBuffer } from './voice-audio-types';
import {
  VoiceAudioEngine,
  classifyOutputRoute,
  isHeadphonesRoute,
  VOICE_BARGE_IN_HOLD_MS,
  VOICE_INPUT_FRAMES,
  type VoiceAudioContextAdapter,
  type VoiceAudioNativeAdapter,
  type VoiceAudioQueueAdapter,
  type VoiceAudioRecorderAdapter,
} from './voice-audio-engine';
import { calculateRmsEnergy, pcm16Base64ToFloat32 } from './voice-pcm';

class FakeQueue implements VoiceAudioQueueAdapter {
  private nextId = 1;
  private listener?: (event: VoiceBufferEndedEvent) => void;
  constructor(private readonly calls: string[]) {}
  connect(): void {
    this.calls.push('queue.connect');
  }
  setOnBufferEnded(listener: (event: VoiceBufferEndedEvent) => void): void {
    this.listener = listener;
  }
  enqueue(samples: Float32Array, sampleRate: number): VoiceQueuedBuffer {
    this.calls.push(`queue.enqueue:${samples.length}:${sampleRate}`);
    return { id: String(this.nextId++), durationMs: (samples.length / sampleRate) * 1000 };
  }
  start(): void {
    this.calls.push('queue.start');
  }
  clear(): void {
    this.calls.push('queue.clear');
  }
  stop(): void {
    this.calls.push('queue.stop');
  }
}

class FakeContext implements VoiceAudioContextAdapter {
  constructor(private readonly calls: string[]) {}
  async resume(): Promise<void> {
    this.calls.push('context.resume');
  }
  createQueue(): VoiceAudioQueueAdapter {
    this.calls.push('context.createQueue');
    return new FakeQueue(this.calls);
  }
  async close(): Promise<void> {
    this.calls.push('context.close');
  }
}

class FakeRecorder implements VoiceAudioRecorderAdapter {
  input?: (event: { buffer: { getChannelData(channel: number): Float32Array }; numFrames: number }) => void;
  error?: (message: string) => void;
  constructor(private readonly calls: string[]) {}
  onAudioReady(options: object, listener: NonNullable<FakeRecorder['input']>): void {
    this.calls.push(`recorder.callback:${JSON.stringify(options)}`);
    this.input = listener;
  }
  clearOnAudioReady(): void {
    this.calls.push('recorder.clearCallback');
  }
  onError(listener: (message: string) => void): void {
    this.calls.push('recorder.onError');
    this.error = listener;
  }
  clearOnError(): void {
    this.calls.push('recorder.clearError');
  }
  async start(): Promise<void> {
    this.calls.push('recorder.start');
  }
  async stop(): Promise<void> {
    this.calls.push('recorder.stop');
  }
}

class FakeNative implements VoiceAudioNativeAdapter {
  calls: string[] = [];
  recorder = new FakeRecorder(this.calls);
  routeListener?: () => void;
  appStateListener?: (state: string) => void;
  hasInputDevice = true;
  isHeadphonesDevice = false;
  outputRoute: ReturnType<typeof classifyOutputRoute> = 'speaker';
  preferredSampleRate = 48_000;
  /** When set, activating the audio session waits for it. */
  sessionGate?: Promise<void>;
  /** What iOS reports for voice processing; undefined = unknown (older native build). */
  voiceProcessingActive?: boolean;

  setSessionOptions(options: object): void {
    this.calls.push(`session.options:${JSON.stringify(options)}`);
  }
  async setSessionActive(active: boolean): Promise<void> {
    this.calls.push(`session.active:${active}`);
    if (active && this.sessionGate) await this.sessionGate;
  }
  getPreferredSampleRate(): number {
    this.calls.push(`session.sampleRate:${this.preferredSampleRate}`);
    return this.preferredSampleRate;
  }
  createContext(sampleRate: number): VoiceAudioContextAdapter {
    this.calls.push(`context.create:${sampleRate}`);
    return new FakeContext(this.calls);
  }
  createRecorder(options: object): VoiceAudioRecorderAdapter {
    this.calls.push(`recorder.create:${JSON.stringify(options)}`);
    return this.recorder;
  }
  addRouteChangeListener(listener: () => void): { remove(): void } {
    this.routeListener = listener;
    return { remove: () => this.calls.push('route.remove') };
  }
  addAppStateListener(listener: (state: string) => void): { remove(): void } {
    this.appStateListener = listener;
    return { remove: () => this.calls.push('appState.remove') };
  }
  async hasInput(): Promise<boolean> {
    return this.hasInputDevice;
  }
  async isHeadphonesConnected(): Promise<boolean> {
    return this.isHeadphonesDevice;
  }
  async getOutputRoute() {
    return this.outputRoute;
  }
  isVoiceProcessingActive(): boolean | undefined {
    return this.voiceProcessingActive;
  }
  async requestRecordingPermission(): Promise<'Granted'> {
    return 'Granted';
  }
}

describe('VoiceAudioEngine', () => {
  test('uses iOS voice processing only when asked to', async () => {
    const native = new FakeNative();
    const engine = new VoiceAudioEngine({ native, iosVoiceProcessing: true });

    await engine.start(() => {});

    expect(native.calls).toContain(
      'recorder.create:{"iosVoiceProcessing":true,"androidInputPreset":"voiceCommunication"}',
    );
  });

  test('starts a voice-chat audio session before capture', async () => {
    const native = new FakeNative();
    const engine = new VoiceAudioEngine({ native });

    await engine.start(() => {});

    expect(native.calls.slice(0, 7)).toEqual([
      'session.options:{"iosCategory":"playAndRecord","iosMode":"voiceChat","iosOptions":["defaultToSpeaker","allowBluetoothHFP"]}',
      'session.active:true',
      'recorder.create:{"iosVoiceProcessing":false,"androidInputPreset":"voiceCommunication"}',
      'session.sampleRate:48000',
      'context.create:48000',
      'context.resume',
      'context.createQueue',
    ]);
    expect(native.calls).toContain('queue.connect');
    expect(native.calls).toContain(
      `recorder.callback:{"sampleRate":16000,"bufferLength":${VOICE_INPUT_FRAMES},"channelCount":1}`,
    );
    expect(native.calls.at(-1)).toBe('recorder.start');
  });

  test('resamples 24 kHz model output to the native playback context rate', async () => {
    const native = new FakeNative();
    const engine = new VoiceAudioEngine({ native });
    await engine.start(() => {});

    const pcmSamples = new Float32Array(4_800).fill(0.1);
    const pcmBase64 = btoa(String.fromCharCode(...new Uint8Array(pcmSamples.length * 2)));
    engine.enqueueOutput(pcmBase64, 1);

    expect(native.calls).toContain('queue.enqueue:9600:48000');
  });

  test('falls back to a stable 48 kHz playback context when the native rate is invalid', async () => {
    const native = new FakeNative();
    native.preferredSampleRate = 0;
    const engine = new VoiceAudioEngine({ native });

    await engine.start(() => {});

    expect(native.calls).toContain('context.create:48000');
    expect(engine.snapshot().playbackContextSampleRate).toBe(48_000);
  });


  test('forwards actual mono frames as PCM16 and counts duration anomalies', async () => {
    const native = new FakeNative();
    const chunks: string[] = [];
    const levels: number[] = [];
    const engine = new VoiceAudioEngine({ native });
    await engine.start((chunk, rms) => {
      chunks.push(chunk);
      levels.push(rms);
    });

    const samples = Float32Array.from({ length: VOICE_INPUT_FRAMES }, (_, index) => index / VOICE_INPUT_FRAMES);
    native.recorder.input?.({ buffer: { getChannelData: () => samples }, numFrames: VOICE_INPUT_FRAMES });
    const short = samples.subarray(0, VOICE_INPUT_FRAMES / 2);
    native.recorder.input?.({ buffer: { getChannelData: () => short }, numFrames: VOICE_INPUT_FRAMES / 2 });

    const decoded = pcm16Base64ToFloat32(chunks[0]);
    expect(decoded.ok && decoded.samples.length).toBe(VOICE_INPUT_FRAMES);
    const shortDecoded = pcm16Base64ToFloat32(chunks[1]);
    expect(shortDecoded.ok && shortDecoded.samples.length).toBe(VOICE_INPUT_FRAMES / 2);
    expect(levels).toEqual([calculateRmsEnergy(samples), calculateRmsEnergy(short)]);
    expect(engine.snapshot().captureDurationAnomalies).toBe(1);
    expect(engine.snapshot()).toMatchObject({
      modelOutputSampleRate: 24_000,
      playbackContextSampleRate: 48_000,
    });
  });

  test('keeps running in the background and cleans up exactly once when stop repeats', async () => {
    const native = new FakeNative();
    const failures: Error[] = [];
    const engine = new VoiceAudioEngine({ native, onFatalError: (error) => failures.push(error) });
    await engine.start(() => {});

    await engine.handleAppState('background');
    expect(failures).toHaveLength(0);
    expect(native.calls).not.toContain('recorder.stop');
    await engine.stop();
    await engine.stop();

    expect(failures).toHaveLength(0);
    for (const call of [
      'recorder.clearCallback',
      'recorder.clearError',
      'recorder.stop',
      'queue.stop',
      'context.close',
      'session.active:false',
    ]) {
      expect(native.calls.filter((entry) => entry === call)).toHaveLength(1);
    }
  });

  test('fails safely when a route change leaves no input', async () => {
    const native = new FakeNative();
    const failures: Error[] = [];
    const engine = new VoiceAudioEngine({ native, onFatalError: (error) => failures.push(error) });
    await engine.start(() => {});
    native.hasInputDevice = false;

    native.routeListener?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(engine.snapshot().routeChanges).toBe(1);
    expect(failures[0]?.message).toContain('audio input');
  });

  test('rebuilds playback when an audio route changes the device sample rate', async () => {
    const native = new FakeNative();
    const engine = new VoiceAudioEngine({ native });
    await engine.start(() => {});
    native.preferredSampleRate = 44_100;

    native.routeListener?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(native.calls).toContain('context.create:44100');
    expect(native.calls).toContain('context.close');
    expect(engine.snapshot()).toMatchObject({
      playbackContextSampleRate: 44_100,
      routeChanges: 1,
      routeRebuilds: 1,
    });
  });

  test('preserves the current interruption epoch across a route rebuild', async () => {
    const native = new FakeNative();
    const engine = new VoiceAudioEngine({ native });
    await engine.start(() => {});
    engine.interruptOutput(2);
    native.preferredSampleRate = 44_100;

    native.routeListener?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const pcmBase64 = btoa(String.fromCharCode(...new Uint8Array(4_800)));
    expect(engine.enqueueOutput(pcmBase64, 2)).toBe(true);
    expect(native.calls).toContain('queue.enqueue:4410:44100');
  });

  test('names the output route, keeping Bluetooth call audio apart from Bluetooth media', () => {
    expect(classifyOutputRoute(undefined)).toBe('unknown');
    expect(classifyOutputRoute([])).toBe('unknown');
    // iOS port types
    expect(classifyOutputRoute([{ name: 'Speaker', category: 'Speaker' }])).toBe('speaker');
    expect(classifyOutputRoute([{ name: 'Receiver', category: 'Receiver' }])).toBe('earpiece');
    expect(classifyOutputRoute([{ name: 'Headphones', category: 'Headphones' }])).toBe('wired');
    expect(classifyOutputRoute([{ name: 'USB', category: 'USBAudio' }])).toBe('wired');
    expect(classifyOutputRoute([{ name: 'Bose', category: 'BluetoothHFP' }])).toBe('bluetooth-call');
    expect(classifyOutputRoute([{ name: 'AirPods', category: 'BluetoothA2DPOutput' }])).toBe('bluetooth-media');
    expect(classifyOutputRoute([{ name: 'Beats', category: 'BluetoothLE' }])).toBe('bluetooth-media');
    expect(classifyOutputRoute([{ name: 'Car', category: 'CarAudio' }])).toBe('other');
    // Android device types
    expect(classifyOutputRoute([{ name: 'x', category: 'Built-in Speaker' }])).toBe('speaker');
    expect(classifyOutputRoute([{ name: 'x', category: 'Built-in Earpiece' }])).toBe('earpiece');
    expect(classifyOutputRoute([{ name: 'x', category: 'Wired Headset' }])).toBe('wired');
    expect(classifyOutputRoute([{ name: 'x', category: 'Bluetooth SCO' }])).toBe('bluetooth-call');
    expect(classifyOutputRoute([{ name: 'x', category: 'Bluetooth A2DP' }])).toBe('bluetooth-media');
    expect(classifyOutputRoute([{ name: 'x', category: 'Other (27)' }])).toBe('other');
  });

  test('reports the output route at start and after the last route change', async () => {
    const native = new FakeNative();
    native.outputRoute = 'speaker';
    const engine = new VoiceAudioEngine({ native });
    await engine.start(() => {});
    expect(engine.snapshot()).toMatchObject({ startOutputRoute: 'speaker', outputRoute: 'speaker' });

    native.outputRoute = 'bluetooth-call';
    native.routeListener?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(engine.snapshot()).toMatchObject({
      startOutputRoute: 'speaker',
      outputRoute: 'bluetooth-call',
    });
  });

  test('leaves the microphone off when stopped while still starting', async () => {
    const native = new FakeNative();
    let openSession!: () => void;
    native.sessionGate = new Promise((resolve) => {
      openSession = resolve;
    });
    const failures: Error[] = [];
    const engine = new VoiceAudioEngine({ native, onFatalError: (error) => failures.push(error) });

    const starting = engine.start(() => {});
    await engine.stop();
    openSession();
    await starting;

    expect(native.calls).not.toContain('recorder.start');
    expect(native.calls.filter((call) => call.startsWith('context.create'))).toHaveLength(0);
    expect(native.calls.at(-1)).toBe('session.active:false');
    expect(failures).toHaveLength(0);
  });

  test('classifies headphone and speaker output routes correctly', () => {
    expect(isHeadphonesRoute([])).toBe(false);
    expect(isHeadphonesRoute(undefined)).toBe(false);
    expect(isHeadphonesRoute([{ name: 'Speaker', category: 'Speaker' }])).toBe(false);
    expect(isHeadphonesRoute([{ name: 'Receiver', category: 'Receiver' }])).toBe(false);
    expect(isHeadphonesRoute([{ name: 'AirPods Pro', category: 'BluetoothA2DPOutput' }])).toBe(true);
    expect(isHeadphonesRoute([{ name: 'Headphones', category: 'Headphones' }])).toBe(true);
    expect(isHeadphonesRoute([{ name: 'Bose QC', category: 'BluetoothHFP' }])).toBe(true);
  });

  test('shields initial greeting from transmitting mic chunks and streams freely after disarm', async () => {
    const native = new FakeNative();
    const chunks: string[] = [];
    const engine = new VoiceAudioEngine({ native });

    await engine.start((chunk) => chunks.push(chunk));

    // Play greeting and arm greeting shield
    const pcmSamples = new Float32Array(4800).fill(0.1);
    const pcmBase64 = btoa(String.fromCharCode(...new Uint8Array(pcmSamples.length * 2)));
    engine.enqueueOutput(pcmBase64, 1);
    engine.armGreetingShield();

    // Input arrives while greeting shield is active (e.g. echo or user background noise)
    const micData = new Float32Array(VOICE_INPUT_FRAMES).fill(0.05);
    native.recorder.input?.({
      buffer: { getChannelData: () => micData },
      numFrames: VOICE_INPUT_FRAMES,
    });

    // Greeting shield blocks transmission
    expect(chunks).toHaveLength(0);
    expect(engine.isPlaying()).toBe(true);

    // Finish greeting turn and clear playback
    engine.finishOutputTurn({ forceDisarm: true });
    engine.interruptOutput(2);

    // After shield is disarmed and output ends, mic data is transmitted continuously
    native.recorder.input?.({
      buffer: { getChannelData: () => micData },
      numFrames: VOICE_INPUT_FRAMES,
    });
    expect(chunks).toHaveLength(1);
  });

  test('interruptOutput stops playback and increments epoch cleanly', async () => {
    const native = new FakeNative();
    const engine = new VoiceAudioEngine({ native });

    await engine.start(() => {});

    // Start playback
    const pcmSamples = new Float32Array(4800).fill(0.1);
    const pcmBase64 = btoa(String.fromCharCode(...new Uint8Array(pcmSamples.length * 2)));
    engine.enqueueOutput(pcmBase64, 1);
    expect(engine.isPlaying()).toBe(true);

    // Server sends interruption signal -> engine interrupts output
    engine.interruptOutput(2);
    expect(engine.isPlaying()).toBe(false);
    expect(engine.getEpoch()).toBe(2);
  });

  test('suppresses mic uplink while audio is playing through device loudspeaker to prevent acoustic echo', async () => {
    const native = new FakeNative();
    native.isHeadphonesDevice = false;
    const chunks: string[] = [];
    const engine = new VoiceAudioEngine({ native });

    await engine.start((chunk) => chunks.push(chunk));
    expect(engine.isHeadphonesActive()).toBe(false);

    // AI begins speaking
    const pcmSamples = new Float32Array(4800).fill(0.1);
    const pcmBase64 = btoa(String.fromCharCode(...new Uint8Array(pcmSamples.length * 2)));
    engine.enqueueOutput(pcmBase64, 1);
    expect(engine.isPlaying()).toBe(true);

    // Speaker echo enters the microphone while AI is speaking
    const echoFrame = new Float32Array(VOICE_INPUT_FRAMES).fill(0.05);
    native.recorder.input?.({
      buffer: { getChannelData: () => echoFrame },
      numFrames: VOICE_INPUT_FRAMES,
    });

    // Suppressed! No echo chunk is dispatched to Gemini Live
    expect(chunks).toHaveLength(0);

    // Finish turn and clear playback
    engine.finishOutputTurn({ forceDisarm: true });
    engine.interruptOutput(2);

    // Now that output is no longer audible, user speech flows through
    const userVoice = new Float32Array(VOICE_INPUT_FRAMES).fill(0.1);
    native.recorder.input?.({
      buffer: { getChannelData: () => userVoice },
      numFrames: VOICE_INPUT_FRAMES,
    });
    expect(chunks).toHaveLength(1);
  });

  test('allows full duplex mic streaming during playback when headphones are connected', async () => {
    const native = new FakeNative();
    native.isHeadphonesDevice = true;
    const chunks: string[] = [];
    const engine = new VoiceAudioEngine({ native });

    await engine.start((chunk) => chunks.push(chunk));
    expect(engine.isHeadphonesActive()).toBe(true);

    // AI begins speaking
    const pcmSamples = new Float32Array(4800).fill(0.1);
    const pcmBase64 = btoa(String.fromCharCode(...new Uint8Array(pcmSamples.length * 2)));
    engine.enqueueOutput(pcmBase64, 1);
    expect(engine.isPlaying()).toBe(true);

    // User speaks into mic while listening through headphones
    const userVoice = new Float32Array(VOICE_INPUT_FRAMES).fill(0.1);
    native.recorder.input?.({
      buffer: { getChannelData: () => userVoice },
      numFrames: VOICE_INPUT_FRAMES,
    });

    // Passthrough! Full duplex allows natural vocal interruption
    expect(chunks).toHaveLength(1);
  });

  test('streams mic audio during loudspeaker playback when speaker full duplex is enabled', async () => {
    const native = new FakeNative();
    native.isHeadphonesDevice = false;
    const chunks: string[] = [];
    const engine = new VoiceAudioEngine({ native, speakerFullDuplex: true });

    await engine.start((chunk) => chunks.push(chunk));
    engine.armGreetingShield();

    const pcmSamples = new Float32Array(4800).fill(0.1);
    const pcmBase64 = btoa(String.fromCharCode(...new Uint8Array(pcmSamples.length * 2)));
    engine.enqueueOutput(pcmBase64, 1);
    expect(engine.isPlaying()).toBe(true);

    const userVoice = new Float32Array(VOICE_INPUT_FRAMES).fill(0.1);
    native.recorder.input?.({
      buffer: { getChannelData: () => userVoice },
      numFrames: VOICE_INPUT_FRAMES,
    });

    expect(chunks).toHaveLength(1);
  });

  test('applies the server speaker duplex policy after construction', async () => {
    const native = new FakeNative();
    native.isHeadphonesDevice = false;
    const chunks: string[] = [];
    const engine = new VoiceAudioEngine({ native });

    await engine.start((chunk) => chunks.push(chunk));
    engine.armGreetingShield();
    engine.setSpeakerFullDuplex(true);

    const pcmSamples = new Float32Array(4800).fill(0.1);
    engine.enqueueOutput(btoa(String.fromCharCode(...new Uint8Array(pcmSamples.length * 2))), 1);
    native.recorder.input?.({
      buffer: { getChannelData: () => new Float32Array(VOICE_INPUT_FRAMES).fill(0.1) },
      numFrames: VOICE_INPUT_FRAMES,
    });

    expect(chunks).toHaveLength(1);
  });

  test('reports whether native playback is active', async () => {
    const native = new FakeNative();
    const engine = new VoiceAudioEngine({ native });

    await engine.start(() => {});

    expect(engine.snapshot().nativePlayback).toBe(false);
  });

  test('reports where microphone frames go, and how loud the sent audio is', async () => {
    const native = new FakeNative();
    native.isHeadphonesDevice = false;
    const chunks: string[] = [];
    const levels: number[] = [];
    const engine = new VoiceAudioEngine({ native });
    await engine.start((chunk, rms) => {
      chunks.push(chunk);
      levels.push(rms);
    });
    const frame = (level: number) => ({
      buffer: { getChannelData: () => new Float32Array(VOICE_INPUT_FRAMES).fill(level) },
      numFrames: VOICE_INPUT_FRAMES,
    });

    engine.armGreetingShield();
    native.recorder.input?.(frame(0.2));
    engine.disarmGreetingShield();

    const pcmSamples = new Float32Array(4800).fill(0.1);
    engine.enqueueOutput(btoa(String.fromCharCode(...new Uint8Array(pcmSamples.length * 2))), 1);
    native.recorder.input?.(frame(0.2));
    engine.interruptOutput(2);

    native.recorder.input?.(frame(0.25));
    native.recorder.input?.(frame(0.01));

    expect(chunks).toHaveLength(2);
    const snapshot = engine.snapshot();
    expect(snapshot.uplinkCaptured).toBe(4);
    expect(snapshot.uplinkDroppedShield).toBe(1);
    expect(snapshot.uplinkDroppedSpeakerGate).toBe(1);
    expect(snapshot.uplinkDelivered).toBe(2);
    expect(snapshot.uplinkPeakRms).toBeCloseTo(0.25, 5);
  });

  test('does not shield the greeting on earphones, where there is no echo to block', async () => {
    const native = new FakeNative();
    native.isHeadphonesDevice = true;
    const chunks: string[] = [];
    const engine = new VoiceAudioEngine({ native });
    await engine.start((chunk) => chunks.push(chunk));

    engine.armGreetingShield();
    native.recorder.input?.({
      buffer: { getChannelData: () => new Float32Array(VOICE_INPUT_FRAMES).fill(0.1) },
      numFrames: VOICE_INPUT_FRAMES,
    });

    expect(chunks).toHaveLength(1);
    expect(engine.snapshot().uplinkDroppedShield).toBe(0);
  });

  describe('echo on the loudspeaker', () => {
    const SPEAKING = btoa(String.fromCharCode(...new Uint8Array(4_800 * 2)));
    const frame = (level: number) => new Float32Array(VOICE_INPUT_FRAMES).fill(level);
    const feed = (native: FakeNative, samples: Float32Array) =>
      native.recorder.input?.({ buffer: { getChannelData: () => samples }, numFrames: samples.length });
    const isSilent = (chunk: string) => {
      const decoded = pcm16Base64ToFloat32(chunk);
      return decoded.ok && decoded.samples.every((sample) => sample === 0);
    };

    test('falls back to the speaker gate when iOS did not actually engage echo cancellation', async () => {
      const native = new FakeNative();
      native.voiceProcessingActive = false;
      const chunks: string[] = [];
      const engine = new VoiceAudioEngine({ native, iosVoiceProcessing: true, speakerFullDuplex: true });
      await engine.start((chunk) => chunks.push(chunk));
      // The server's device policy arriving later must not re-enable it.
      engine.setSpeakerFullDuplex(true);

      engine.enqueueOutput(SPEAKING, 1);
      feed(native, frame(0.2));

      expect(chunks).toHaveLength(0);
      expect(engine.snapshot()).toMatchObject({ voiceProcessingActive: false, speakerFullDuplex: false });
    });

    test('keeps full duplex when echo cancellation is confirmed, or unknown on older native builds', async () => {
      for (const active of [true, undefined]) {
        const native = new FakeNative();
        native.voiceProcessingActive = active;
        const engine = new VoiceAudioEngine({ native, iosVoiceProcessing: true, speakerFullDuplex: true });
        await engine.start(() => {});
        expect(engine.snapshot()).toMatchObject({ voiceProcessingActive: active, speakerFullDuplex: true });
      }
    });

    test('replaces leftover echo with silence while Memento is audible on the speaker', async () => {
      const native = new FakeNative();
      const chunks: string[] = [];
      const levels: number[] = [];
      const engine = new VoiceAudioEngine({ native, speakerFullDuplex: true });
      await engine.start((chunk, rms) => {
        chunks.push(chunk);
        levels.push(rms);
      });

      engine.enqueueOutput(SPEAKING, 1);
      feed(native, frame(0.03));

      expect(chunks).toHaveLength(1);
      expect(isSilent(chunks[0])).toBe(true);
      // Echo must not count as the user speaking in latency metrics either.
      expect(levels).toEqual([0]);
      expect(engine.snapshot()).toMatchObject({ uplinkEchoSuppressed: 1, bargeIns: 0 });
    });

    test('lets a clear voice barge in and keeps the mic open for the rest of the sentence', async () => {
      const native = new FakeNative();
      const clock = { now: 10_000 };
      const chunks: string[] = [];
      const engine = new VoiceAudioEngine({ native, speakerFullDuplex: true, now: () => clock.now });
      await engine.start((chunk) => chunks.push(chunk));
      engine.enqueueOutput(SPEAKING, 1);

      feed(native, frame(0.2)); // "wait"
      clock.now += 400;
      feed(native, frame(0.03)); // a softer word mid-sentence
      clock.now += VOICE_BARGE_IN_HOLD_MS;
      feed(native, frame(0.03)); // back to leftover echo

      expect(chunks.map(isSilent)).toEqual([false, false, true]);
      expect(engine.snapshot()).toMatchObject({ bargeIns: 1, uplinkEchoSuppressed: 1 });
    });

    test('does not filter on earphones, where there is no acoustic echo', async () => {
      const native = new FakeNative();
      native.isHeadphonesDevice = true;
      const chunks: string[] = [];
      const engine = new VoiceAudioEngine({ native, speakerFullDuplex: true });
      await engine.start((chunk) => chunks.push(chunk));
      engine.enqueueOutput(SPEAKING, 1);

      feed(native, frame(0.03));

      expect(chunks.map(isSilent)).toEqual([false]);
    });
  });
});
