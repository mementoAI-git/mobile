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
  test('starts once with the call start time, then sends only changes', () => {
    const { adapter, calls } = fakeAdapter();
    const controller = new CallActivityController(adapter, () => 100_000);

    controller.sync(live({ recordingTime: 4 }));
    controller.sync(live({ recordingTime: 5 }));
    controller.sync(live({ isAiSpeaking: true }));
    controller.sync(live({ isAiSpeaking: true, recordingTime: 9 }));
    controller.sync(live({ isMuted: true }));

    expect(calls).toEqual([
      ['start', 96_000, 'listening', false],
      ['update', 'speaking', false],
      ['update', 'muted', true],
    ]);
  });

  test('ends when the call ends and starts fresh for the next call', () => {
    const { adapter, calls } = fakeAdapter();
    const controller = new CallActivityController(adapter, () => 50_000);

    controller.sync(live());
    controller.sync(live({ isConnected: false }));
    controller.sync(live({ isConnected: false }));
    controller.sync(live({ isMuted: true }));

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
});
