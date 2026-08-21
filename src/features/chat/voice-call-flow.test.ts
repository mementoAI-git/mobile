import { describe, expect, test } from 'bun:test';
import {
  formatVoiceCallDuration,
  getInitialVoiceCallStage,
  getVoiceCallTransition,
} from './voice-call-flow';

describe('voice call flow', () => {
  test('sends first-time users to selection and returning users to ready', () => {
    expect(getInitialVoiceCallStage(null)).toBe('choosing');
    expect(getInitialVoiceCallStage('denver')).toBe('ready');
  });

  test('moves through connection and live states deterministically', () => {
    expect(getVoiceCallTransition('ready', 'start')).toBe('connecting');
    expect(getVoiceCallTransition('connecting', 'connected')).toBe('live');
    expect(getVoiceCallTransition('live', 'toggle-mute')).toBe('muted');
    expect(getVoiceCallTransition('muted', 'toggle-mute')).toBe('live');
  });

  test('returns to ready for a voice change and confirms only a live end', () => {
    expect(getVoiceCallTransition('live', 'change-voice')).toBe('ready');
    expect(getVoiceCallTransition('muted', 'change-voice')).toBe('ready');
    expect(getVoiceCallTransition('live', 'request-end')).toBe('ending');
    expect(getVoiceCallTransition('ready', 'request-end')).toBe('closed');
  });

  test('formats call time as reference MM:SS without resetting long calls', () => {
    expect(formatVoiceCallDuration(0)).toBe('00:00');
    expect(formatVoiceCallDuration(22)).toBe('00:22');
    expect(formatVoiceCallDuration(3661)).toBe('61:01');
  });
});
