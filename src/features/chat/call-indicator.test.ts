import { describe, expect, test } from 'bun:test';

import {
  callIndicatorStatus,
  callIndicatorVariant,
  isCallLive,
  islandCapsuleFrame,
  shouldShowCallIndicator,
} from './call-indicator';

const show = (overrides: Partial<Parameters<typeof shouldShowCallIndicator>[0]> = {}) =>
  shouldShowCallIndicator({
    isConnected: true,
    pathname: '/chat/abc',
    platform: 'ios',
    callPath: '/voice-call',
    ...overrides,
  });

describe('shouldShowCallIndicator', () => {
  test('shows during a call on ordinary screens', () => {
    expect(show()).toBe(true);
    expect(show({ platform: 'android' })).toBe(true);
  });

  test('hides with no call and on the call screen', () => {
    expect(show({ isConnected: false })).toBe(false);
    expect(show({ pathname: '/voice-call' })).toBe(false);
  });

  test('hides under iOS full-screen modals only', () => {
    expect(show({ pathname: '/editor' })).toBe(false);
    expect(show({ pathname: '/article' })).toBe(false);
    expect(show({ pathname: '/editor', platform: 'android' })).toBe(true);
  });
});

describe('callIndicatorVariant', () => {
  test('uses the island capsule on Dynamic Island iPhones only', () => {
    expect(callIndicatorVariant('ios', 59)).toBe('island');
    expect(callIndicatorVariant('ios', 62)).toBe('island');
    expect(callIndicatorVariant('ios', 47)).toBe('statusBar');
    expect(callIndicatorVariant('ios', 20)).toBe('statusBar');
    expect(callIndicatorVariant('android', 64)).toBe('statusBar');
  });
});

describe('islandCapsuleFrame', () => {
  // Island frames: top 11.33, height 37.33 (59pt inset); top 14, height 37 (62pt inset).
  test.each([
    [59, 11.33, 48.67],
    [62, 14, 51],
  ])('hides the whole island inside the capsule (inset %d)', (inset, islandTop, islandBottom) => {
    const frame = islandCapsuleFrame(inset);
    expect(frame.top).toBeLessThanOrEqual(islandTop - 3);
    expect(frame.top + frame.height).toBeGreaterThanOrEqual(islandBottom + frame.rowHeight);
    expect(frame.width).toBeGreaterThanOrEqual(126 + 40);
  });

  test('stays narrow enough to clear the status bar clock and icons', () => {
    expect(islandCapsuleFrame(59).width).toBeLessThanOrEqual(172);
  });
});

describe('callIndicatorStatus', () => {
  test('describes the call state', () => {
    expect(callIndicatorStatus({ isMuted: true, isAiSpeaking: true })).toBe('Muted');
    expect(callIndicatorStatus({ isMuted: false, isAiSpeaking: true })).toBe('Memento is speaking');
    expect(callIndicatorStatus({ isMuted: false, isAiSpeaking: false })).toBe('Listening');
  });
});

describe('isCallLive', () => {
  test('a call stops being live the moment it is hung up', () => {
    expect(isCallLive({ isConnected: true, isEnding: false })).toBe(true);
    expect(isCallLive({ isConnected: true, isEnding: true })).toBe(false);
    expect(isCallLive({ isConnected: false, isEnding: false })).toBe(false);
  });
});
