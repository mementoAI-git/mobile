import { describe, expect, test } from 'bun:test';

import type { VoiceBufferEndedEvent, VoiceQueuedBuffer } from './voice-audio-types';
import {
  VoiceAudioEngine,
  type VoiceAudioContextAdapter,
  type VoiceAudioNativeAdapter,
  type VoiceAudioQueueAdapter,
  type VoiceAudioRecorderAdapter,
} from './voice-audio-engine';
import { pcm16Base64ToFloat32 } from './voice-pcm';

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

  setSessionOptions(options: object): void {
    this.calls.push(`session.options:${JSON.stringify(options)}`);
  }
  async setSessionActive(active: boolean): Promise<void> {
    this.calls.push(`session.active:${active}`);
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
  async requestRecordingPermission(): Promise<'Granted'> {
    return 'Granted';
  }
}

describe('VoiceAudioEngine', () => {
  test('starts a voice-chat audio session before capture', async () => {
    const native = new FakeNative();
    const engine = new VoiceAudioEngine({ native });

    await engine.start(() => {});

    expect(native.calls.slice(0, 7)).toEqual([
      'session.options:{"iosCategory":"playAndRecord","iosMode":"voiceChat","iosOptions":["defaultToSpeaker","allowBluetoothHFP"]}',
      'session.active:true',
      'context.create:24000',
      'context.resume',
      'recorder.create:{"iosVoiceProcessing":true,"androidInputPreset":"voiceCommunication"}',
      'context.createQueue',
      'queue.connect',
    ]);
    expect(native.calls).toContain(
      'recorder.callback:{"sampleRate":16000,"bufferLength":1600,"channelCount":1}',
    );
    expect(native.calls.at(-1)).toBe('recorder.start');
  });

  test('forwards actual mono frames as PCM16 and counts duration anomalies', async () => {
    const native = new FakeNative();
    const chunks: string[] = [];
    const engine = new VoiceAudioEngine({ native });
    await engine.start((chunk) => chunks.push(chunk));

    const samples = Float32Array.from({ length: 1_600 }, (_, index) => index / 1_600);
    native.recorder.input?.({ buffer: { getChannelData: () => samples }, numFrames: 1_600 });
    const short = samples.subarray(0, 800);
    native.recorder.input?.({ buffer: { getChannelData: () => short }, numFrames: 800 });

    const decoded = pcm16Base64ToFloat32(chunks[0]);
    expect(decoded.ok && decoded.samples.length).toBe(1_600);
    const shortDecoded = pcm16Base64ToFloat32(chunks[1]);
    expect(shortDecoded.ok && shortDecoded.samples.length).toBe(800);
    expect(engine.snapshot().captureDurationAnomalies).toBe(1);
  });

  test('cleans up exactly once when backgrounded and when stop repeats', async () => {
    const native = new FakeNative();
    const failures: Error[] = [];
    const engine = new VoiceAudioEngine({ native, onFatalError: (error) => failures.push(error) });
    await engine.start(() => {});

    await engine.handleAppState('background');
    await engine.stop();

    expect(failures).toHaveLength(1);
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
});
