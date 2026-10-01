import { describe, expect, test } from 'bun:test';

import { callStripStatus, shouldShowCallStrip } from './call-strip';

const show = (overrides: Partial<Parameters<typeof shouldShowCallStrip>[0]> = {}) =>
  shouldShowCallStrip({
    isConnected: true,
    pathname: '/chat/abc',
    platform: 'ios',
    callPath: '/voice-call',
    ...overrides,
  });

describe('shouldShowCallStrip', () => {
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

describe('callStripStatus', () => {
  test('describes the call state', () => {
    expect(callStripStatus({ isMuted: true, isAiSpeaking: true })).toBe('Muted, tap to talk');
    expect(callStripStatus({ isMuted: false, isAiSpeaking: true })).toBe('Memento is speaking');
    expect(callStripStatus({ isMuted: false, isAiSpeaking: false })).toBe('Listening');
  });
});