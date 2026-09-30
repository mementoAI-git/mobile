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
}

const DEFAULT_OPTIONS: Required<NativeVoicePlaybackOptions> = {
  sourceSampleRate: 24_000,
  startupBufferMs: 180,
  recoveryBufferMs: 240,
  maxBufferedMs: 5_000,
};

let installationAttempted = false;

function ensureInstalled(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  if (globalThis.__mementoCreateVoicePlaybackSession) return true;
  if (installationAttempted) return false;
  installationAttempted = true;
  return NativeMementoVoiceAudio?.install() === true;
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