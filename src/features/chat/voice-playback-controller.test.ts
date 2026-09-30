import { describe, expect, test } from 'bun:test';

import type {
  VoiceBufferEndedEvent,
  VoicePlaybackRuntime,
  VoiceTimerScheduler,
} from './voice-audio-types';
import {
  VOICE_MAX_QUEUE_MS,
  VOICE_PREBUFFER_MS,
  VOICE_RECOVERY_PREBUFFER_MS,
  VoicePlaybackController,
} from './voice-playback-controller';
import { VoiceSessionMetrics } from './voice-session-metrics';

class FakeScheduler implements VoiceTimerScheduler {
  private nextId = 1;
  private timers = new Map<number, () => void>();

  setTimeout(callback: () => void): number {
    const id = this.nextId++;
    this.timers.set(id, callback);
    return id;
  }

  clearTimeout(timer: unknown): void {
    this.timers.delete(timer as number);
  }

  fireAll(): void {
    const callbacks = [...this.timers.values()];
    this.timers.clear();
    callbacks.forEach((callback) => callback());
  }

  get size(): number {
    return this.timers.size;
  }
}

class FakeRuntime implements VoicePlaybackRuntime {
  calls: string[] = [];
  nextDurationMs = 40;
  private nextId = 1;
  private onBufferEnded?: (event: VoiceBufferEndedEvent) => void;

  createQueue(onBufferEnded: (event: VoiceBufferEndedEvent) => void): void {
    this.calls.push('createQueue');
    this.onBufferEnded = onBufferEnded;
  }

  enqueue(): { id: string; durationMs: number } {
    const buffer = { id: String(this.nextId++), durationMs: this.nextDurationMs };
    this.calls.push(`enqueue:${buffer.id}`);
    return buffer;
  }

  start(): void {
    this.calls.push('start');
  }

  clear(): void {
    this.calls.push('clear');
  }

  stop(): void {
    this.calls.push('stop');
  }

  end(buffer: { id: string; durationMs: number }, isLastBufferInQueue: boolean): void {
    this.onBufferEnded?.({ ...buffer, isLastBufferInQueue });
  }
}

function setup() {
  const runtime = new FakeRuntime();
  const scheduler = new FakeScheduler();
  const metrics = new VoiceSessionMetrics(() => 0);
  const controller = new VoicePlaybackController(runtime, scheduler, metrics);
  return { runtime, scheduler, metrics, controller };
}

describe('VoicePlaybackController', () => {
  test('holds audio until the initial prebuffer target and cancels the deadline', () => {
    const { runtime, scheduler, controller } = setup();
    runtime.nextDurationMs = 60;
    const chunksBeforeStart = VOICE_PREBUFFER_MS / runtime.nextDurationMs - 1;
    for (let index = 0; index < chunksBeforeStart; index += 1) {
      controller.enqueue('chunk', 1);
    }

    expect(controller.getQueueDepthMs()).toBe(120);
    expect(runtime.calls).not.toContain('start');
    expect(scheduler.size).toBe(1);

    controller.enqueue('chunk', 1);

    expect(controller.getQueueDepthMs()).toBe(180);
    expect(runtime.calls.filter((call) => call === 'start')).toHaveLength(1);
    expect(scheduler.size).toBe(0);
  });

  test('starts a short first chunk when the startup deadline fires', () => {
    const { runtime, scheduler, controller } = setup();
    controller.enqueue('chunk', 1);

    scheduler.fireAll();

    expect(runtime.calls.filter((call) => call === 'start')).toHaveLength(1);
    expect(controller.state).toBe('playing');
  });

  test('replaces the native queue and rejects late chunks after interruption', () => {
    const { runtime, controller } = setup();
    controller.enqueue('chunk', 1);

    controller.interrupt(2);

    expect(runtime.calls.slice(-3)).toEqual(['clear', 'stop', 'createQueue']);
    expect(controller.enqueue('late', 1)).toBe(false);
    expect(controller.enqueue('current', 2)).toBe(true);
    expect(controller.getQueueDepthMs()).toBe(40);
  });

  test('replaces a drained queue and requires a full recovery prebuffer before restarting', () => {
    const { runtime, scheduler, metrics, controller } = setup();
    const first = controller.enqueue('a', 1);
    controller.enqueue('b', 1);
    controller.enqueue('c', 1);
    controller.enqueue('d', 1);
    controller.enqueue('e', 1);
    expect(first).toBe(true);

    runtime.end({ id: '1', durationMs: 40 }, false);
    runtime.end({ id: '2', durationMs: 40 }, false);
    runtime.end({ id: '3', durationMs: 40 }, false);
    runtime.end({ id: '4', durationMs: 40 }, false);
    runtime.end({ id: '5', durationMs: 40 }, true);

    expect(controller.state).toBe('prebuffering');
    expect(metrics.snapshot().underruns).toBe(1);
    expect(runtime.calls.slice(-2)).toEqual(['stop', 'createQueue']);

    const recoveryChunks = VOICE_RECOVERY_PREBUFFER_MS / runtime.nextDurationMs;
    for (let index = 0; index < recoveryChunks - 1; index += 1) {
      controller.enqueue('recovery', 1);
    }
    expect(controller.state).toBe('prebuffering');
    expect(runtime.calls.filter((call) => call === 'start')).toHaveLength(1);
    expect(scheduler.size).toBe(0);

    controller.enqueue('recovery-target', 1);
    expect(controller.state).toBe('playing');
    expect(runtime.calls.filter((call) => call === 'start')).toHaveLength(2);
  });

  test('finishing or stopping a turn leaves no startup timer behind', () => {
    const { scheduler, controller } = setup();
    controller.enqueue('chunk', 1);
    controller.finishTurn();
    expect(scheduler.size).toBe(0);

    controller.stop();
    expect(controller.state).toBe('stopped');
    expect(scheduler.size).toBe(0);
  });

  test('rejects native allocations after playback backlog reaches its memory bound', () => {
    const { runtime, controller } = setup();
    runtime.nextDurationMs = VOICE_MAX_QUEUE_MS;

    expect(controller.enqueue('first', 1)).toBe(true);
    expect(controller.enqueue('overflow', 1)).toBe(false);
    expect(runtime.calls.filter((call) => call.startsWith('enqueue:'))).toHaveLength(1);
  });

  test('records playback pace so sample-rate corruption is observable', () => {
    const runtime = new FakeRuntime();
    const scheduler = new FakeScheduler();
    let timestamp = 0;
    const metrics = new VoiceSessionMetrics(() => timestamp);
    const controller = new VoicePlaybackController(
      runtime,
      scheduler,
      metrics,
      undefined,
      () => timestamp,
    );
    for (let index = 0; index < 5; index += 1) controller.enqueue('chunk', 1);

    timestamp = 20;
    runtime.end({ id: '1', durationMs: 40 }, false);

    expect(metrics.snapshot().maxPlaybackPaceRatio).toBe(2);
  });
});
