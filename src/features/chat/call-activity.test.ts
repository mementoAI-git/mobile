import { describe, expect, test } from 'bun:test';

import {
  CallActivityController,
  callActivityStatus,
  type CallActivityAdapter,
  type CallActivitySnapshot,
} from './call-activity';

function fakeAdapter() {
  const calls: unknown[][] = [];
  const adapter: CallActivityAdapter = {
    start: async (...args) => {
      calls.push(['start', ...args]);
    },
    update: async (...args) => {
      calls.push(['update', ...args]);
    },
    end: async () => {
      calls.push(['end']);
    },
    onAction: () => ({ remove: () => undefined }),
  };
  return { adapter, calls };
}

const live = (overrides: Partial<CallActivitySnapshot> = {}): CallActivitySnapshot => ({
  isConnected: true,
  isMuted: false,
  isAiSpeaking: false,
  recordingTime: 0,
  ...overrides,
});

describe('callActivityStatus', () => {
  test('muted wins, then speaking, then listening', () => {
    expect(callActivityStatus(live({ isMuted: true, isAiSpeaking: true }))).toBe('muted');
    expect(callActivityStatus(live({ isAiSpeaking: true }))).toBe('speaking');
    expect(callActivityStatus(live())).toBe('listening');
  });
});

describe('CallActivityController', () => {
  test('starts once with the call start time, then sends only changes', async () => {
    const { adapter, calls } = fakeAdapter();
    const controller = new CallActivityController(adapter, () => 100_000);

    controller.sync(live({ recordingTime: 4 }));
    controller.sync(live({ recordingTime: 5 }));
    await controller.idle();
    controller.sync(live({ isAiSpeaking: true }));
    controller.sync(live({ isAiSpeaking: true, recordingTime: 9 }));
    await controller.idle();
    controller.sync(live({ isMuted: true }));
    await controller.idle();

    expect(calls).toEqual([
      ['start', 96_000, 'listening', false],
      ['update', 'speaking', false],
      ['update', 'muted', true],
    ]);
  });

  test('ends when the call ends and starts fresh for the next call', async () => {
    const { adapter, calls } = fakeAdapter();
    const controller = new CallActivityController(adapter, () => 50_000);

    controller.sync(live());
    controller.sync(live({ isConnected: false }));
    controller.sync(live({ isConnected: false }));
    controller.sync(live({ isMuted: true }));
    await controller.idle();

    expect(calls).toEqual([
      ['start', 50_000, 'listening', false],
      ['end'],
      ['start', 50_000, 'muted', true],
    ]);
  });

  test('does nothing without a native adapter or before a call', () => {
    const { adapter, calls } = fakeAdapter();
    new CallActivityController(null).sync(live());
    new CallActivityController(adapter).sync(live({ isConnected: false }));
    expect(calls).toEqual([]);
  });

  test('a failing native call never throws into the app', async () => {
    const failing: CallActivityAdapter = {
      start: () => Promise.reject(new Error('activities disabled')),
      update: () => Promise.reject(new Error('x')),
      end: () => Promise.reject(new Error('x')),
      onAction: () => ({ remove: () => undefined }),
    };
    const controller = new CallActivityController(failing);
    expect(() => {
      controller.sync(live());
      controller.sync(live({ isMuted: true }));
      controller.sync(live({ isConnected: false }));
    }).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  test('runs native commands one at a time, in order', async () => {
    const log: string[] = [];
    let releaseStart: () => void = () => undefined;
    const slow: CallActivityAdapter = {
      start: () =>
        new Promise<void>((resolve) => {
          log.push('start:begin');
          releaseStart = () => {
            log.push('start:done');
            resolve();
          };
        }),
      update: async () => {
        log.push('update');
      },
      end: async () => {
        log.push('end');
      },
      onAction: () => ({ remove: () => undefined }),
    };
    const controller = new CallActivityController(slow);

    controller.sync(live());
    controller.sync(live({ isMuted: true }));
    controller.sync(live({ isConnected: false }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(log).toEqual(['start:begin']);

    releaseStart();
    await controller.idle();
    // The mute update was superseded by the hang-up, so it is never sent.
    expect(log).toEqual(['start:begin', 'start:done', 'end']);
  });

  test('a failed command does not block the ones after it', async () => {
    const log: string[] = [];
    const flaky: CallActivityAdapter = {
      start: async () => {
        log.push('start');
        throw new Error('activities disabled');
      },
      update: async () => {
        log.push('update');
      },
      end: async () => {
        log.push('end');
      },
      onAction: () => ({ remove: () => undefined }),
    };
    const controller = new CallActivityController(flaky);

    controller.sync(live());
    controller.sync(live({ isConnected: false }));
    await controller.idle();
    expect(log).toEqual(['start', 'end']);
  });

  test('endNow ends a leftover card even with no live call', async () => {
    const { adapter, calls } = fakeAdapter();
    const controller = new CallActivityController(adapter);

    controller.endNow();
    await controller.idle();
    expect(calls).toEqual([['end']]);
  });

  test('merges status changes queued behind a slow start into the latest one', async () => {
    const log: unknown[][] = [];
    let releaseStart: () => void = () => undefined;
    const slow: CallActivityAdapter = {
      start: () =>
        new Promise<void>((resolve) => {
          log.push(['start']);
          releaseStart = resolve;
        }),
      update: async (...args) => {
        log.push(['update', ...args]);
      },
      end: async () => {
        log.push(['end']);
      },
      onAction: () => ({ remove: () => undefined }),
    };
    const controller = new CallActivityController(slow);

    controller.sync(live());
    controller.sync(live({ isAiSpeaking: true }));
    controller.sync(live({ isAiSpeaking: false }));
    controller.sync(live({ isMuted: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    releaseStart();
    await controller.idle();

    expect(log).toEqual([['start'], ['update', 'muted', true]]);
  });

  test('a failed start is final for that call: no updates, but the next call starts again', async () => {
    const log: string[] = [];
    let failStart = true;
    const adapter: CallActivityAdapter = {
      start: async () => {
        log.push('start');
        if (failStart) throw new Error('Live Activities turned off');
      },
      update: async () => {
        log.push('update');
      },
      end: async () => {
        log.push('end');
      },
      onAction: () => ({ remove: () => undefined }),
    };
    const controller = new CallActivityController(adapter);

    controller.sync(live());
    await controller.idle();
    controller.sync(live({ isMuted: true }));
    controller.sync(live({ isConnected: false }));
    await controller.idle();
    expect(log).toEqual(['start', 'end']);

    failStart = false;
    controller.sync(live());
    controller.sync(live({ isAiSpeaking: true }));
    await controller.idle();
    expect(log).toEqual(['start', 'end', 'start', 'update']);
  });
});

