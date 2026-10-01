import { describe, expect, test } from 'bun:test';

import type { NativeVoicePlaybackSnapshot } from 'react-native-memento-voice';

import type { VoiceTimerScheduler } from './voice-audio-types';
import {
  NativeVoicePlaybackController,
  type NativeVoicePlaybackSessionAdapter,
} from './native-voice-playback-controller';
import { VoiceSessionMetrics } from './voice-session-metrics';

class FakeScheduler implements VoiceTimerScheduler {
  private nextId = 1;
  private callbacks = new Map<number, () => void>();

  setTimeout(callback: () => void): number {
    const id = this.nextId++;
    this.callbacks.set(id, callback);
    return id;
  }

  clearTimeout(timer: unknown): void {
    this.callbacks.delete(timer as number);
  }

  fireOne(): void {
    const first = this.callbacks.entries().next().value as [number, () => void] | undefined;
    if (!first) return;
    this.callbacks.delete(first[0]);
    first[1]();
  }

  get size(): number {
    return this.callbacks.size;
  }
}

class FakeNativeSession implements NativeVoicePlaybackSessionAdapter {
  calls: string[] = [];
  snapshot: NativeVoicePlaybackSnapshot = {
    state: 'idle',
    generation: 3,
    epoch: 7,
    bufferedMs: 0,
    receivedFrames: 0,
    convertedFrames: 0,
    renderedFrames: 0,
    droppedFrames: 0,
    underrunCount: 0,
    overflowCount: 0,
    staleChunkCount: 0,
    sequenceGapCount: 0,
    malformedChunkCount: 0,
    isAudible: false,
  };

  start(generation: number, epoch: number): void {
    this.calls.push(`start:${generation}:${epoch}`);
  }

  pushPCM(_payload: string, generation: number, epoch: number, sequence: number): boolean {
    this.calls.push(`push:${generation}:${epoch}:${sequence}`);
    return true;
  }

  flushTurn(generation: number, epoch: number): void {
    this.calls.push(`flush:${generation}:${epoch}`);
  }

  interrupt(generation: number, nextEpoch: number): void {
    this.calls.push(`interrupt:${generation}:${nextEpoch}`);
    this.snapshot = { ...this.snapshot, state: 'idle', epoch: nextEpoch, isAudible: false };
  }

  getSnapshot(): NativeVoicePlaybackSnapshot {
    return this.snapshot;
  }

  stop(generation: number): void {
    this.calls.push(`stop:${generation}`);
    this.snapshot = { ...this.snapshot, state: 'stopped', isAudible: false };
  }
}

function setup() {
  const session = new FakeNativeSession();
  const scheduler = new FakeScheduler();
  const metrics = new VoiceSessionMetrics(() => 0);
  const states: string[] = [];
  const controller = new NativeVoicePlaybackController(
    session,
    3,
    7,
    metrics,
    (state) => states.push(state),
    scheduler,
  );
  return { session, scheduler, metrics, states, controller };
}

describe('NativeVoicePlaybackController', () => {
  test('forwards generation, epoch, and monotonic sequences only for accepted epochs', () => {
    const { session, controller } = setup();

    expect(controller.enqueue('AAAA', 6)).toBe(false);
    expect(controller.enqueue('AAAA', 7)).toBe(true);
    expect(controller.enqueue('AAAA', 7)).toBe(true);

    expect(session.calls).toEqual(['start:3:7', 'push:3:7:0', 'push:3:7:1']);
  });

  test('tracks native state and underruns through coarse snapshot polling', () => {
    const { session, scheduler, metrics, states, controller } = setup();
    controller.enqueue('AAAA', 7);
    session.snapshot = {
      ...session.snapshot,
      state: 'playing',
      bufferedMs: 160,
      underrunCount: 2,
      isAudible: true,
    };

    scheduler.fireOne();

    expect(controller.state).toBe('playing');
    expect(states).toEqual(['prebuffering', 'playing']);
    expect(metrics.snapshot().underruns).toBe(2);
    expect(metrics.snapshot().maxQueueDepthMs).toBe(160);
  });

  test('interrupts immediately, resets sequence numbering, and rejects old epochs', () => {
    const { session, scheduler, controller } = setup();
    controller.enqueue('AAAA', 7);

    controller.interrupt(8);

    expect(controller.state).toBe('idle');
    expect(scheduler.size).toBe(0);
    expect(controller.enqueue('late', 7)).toBe(false);
    expect(controller.enqueue('current', 8)).toBe(true);
    expect(session.calls).toContain('interrupt:3:8');
    expect(session.calls.at(-1)).toBe('push:3:8:0');
  });

  test('flushes and stops the active generation without leaving a poll timer', () => {
    const { session, scheduler, controller } = setup();
    controller.enqueue('AAAA', 7);
    controller.finishTurn();
    controller.stop();

    expect(session.calls).toContain('flush:3:7');
    expect(session.calls.at(-1)).toBe('stop:3');
    expect(controller.state).toBe('stopped');
    expect(scheduler.size).toBe(0);
  });

  test('keeps adaptive buffer and concealment stats after stop', () => {
    const { session, controller } = setup();
    controller.targetSampleRate = 48_000;
    session.snapshot = { ...session.snapshot, adaptiveExtraMs: 240, concealedFrames: 4_800 };

    controller.stop();
    session.snapshot = { ...session.snapshot, adaptiveExtraMs: 0, concealedFrames: 0 };

    expect(controller.getStats()).toEqual({ adaptiveExtraMs: 240, concealedMs: 100 });
  });
});
