import { describe, expect, test } from 'bun:test';

import { createThrottledSetter, type ThrottleScheduler } from './voice-throttle';

function fakeScheduler() {
  let now = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  let nextId = 1;
  const scheduler: ThrottleScheduler = {
    now: () => now,
    setTimeout: (callback, delayMs) => {
      const id = nextId++;
      timers.set(id, { at: now + delayMs, callback });
      return id;
    },
    clearTimeout: (timer) => {
      timers.delete(timer as number);
    },
  };
  const advance = (ms: number) => {
    now += ms;
    for (const [id, timer] of [...timers.entries()]) {
      if (timer.at <= now) {
        timers.delete(id);
        timer.callback();
      }
    }
  };
  return { scheduler, advance, pendingTimers: () => timers.size };
}

describe('createThrottledSetter', () => {
  test('applies the first value at once and coalesces the rest to the latest', () => {
    const { scheduler, advance } = fakeScheduler();
    const applied: string[] = [];
    const setter = createThrottledSetter((value: string) => applied.push(value), 100, scheduler);

    setter.set('a');
    setter.set('ab');
    setter.set('abc');
    expect(applied).toEqual(['a']);

    advance(100);
    expect(applied).toEqual(['a', 'abc']);

    advance(500);
    setter.set('abcd');
    expect(applied).toEqual(['a', 'abc', 'abcd']);
  });

  test('flush applies the pending value immediately', () => {
    const { scheduler, pendingTimers } = fakeScheduler();
    const applied: string[] = [];
    const setter = createThrottledSetter((value: string) => applied.push(value), 100, scheduler);

    setter.set('a');
    setter.set('final');
    setter.flush();

    expect(applied).toEqual(['a', 'final']);
    expect(pendingTimers()).toBe(0);
  });

  test('cancel drops the pending value', () => {
    const { scheduler, advance } = fakeScheduler();
    const applied: string[] = [];
    const setter = createThrottledSetter((value: string) => applied.push(value), 100, scheduler);

    setter.set('a');
    setter.set('dropped');
    setter.cancel();
    advance(1_000);

    expect(applied).toEqual(['a']);
  });
});