import { describe, expect, it } from 'bun:test';

import {
  VOICE_THINKING_MAX_MS,
  VOICE_THINKING_MIN_SPEECH_FRAMES,
  VOICE_THINKING_QUIET_MS,
  VoiceThinkingTracker,
} from './voice-thinking';

function tracker() {
  let now = 1_000;
  const subject = new VoiceThinkingTracker(() => now);
  return { subject, advance: (ms: number) => (now += ms) };
}

describe('VoiceThinkingTracker', () => {
  it('is not thinking before the user has said anything', () => {
    const { subject, advance } = tracker();
    advance(2_000);
    expect(subject.isThinking(false)).toBe(false);
  });

  it('a short click or cough is not the user speaking', () => {
    const { subject, advance } = tracker();
    for (let i = 0; i < VOICE_THINKING_MIN_SPEECH_FRAMES - 1; i += 1) subject.observeMic(0.2);
    advance(VOICE_THINKING_QUIET_MS);
    expect(subject.isThinking(false)).toBe(false);
  });

  it('thinks after sustained speech and quiet, before any transcript', () => {
    const { subject, advance } = tracker();
    for (let i = 0; i < VOICE_THINKING_MIN_SPEECH_FRAMES; i += 1) {
      subject.observeMic(0.05);
      advance(40);
    }
    advance(VOICE_THINKING_QUIET_MS);
    expect(subject.isThinking(false)).toBe(true);
  });

  it('thinks once the user has been heard and gone quiet', () => {
    const { subject, advance } = tracker();
    subject.observeMic(0.2);
    subject.observeUserTranscript();
    advance(VOICE_THINKING_QUIET_MS - 1);
    expect(subject.isThinking(false)).toBe(false);
    advance(1);
    expect(subject.isThinking(false)).toBe(true);
  });

  it('stops thinking while the user keeps talking', () => {
    const { subject, advance } = tracker();
    subject.observeUserTranscript();
    advance(VOICE_THINKING_QUIET_MS);
    expect(subject.isThinking(false)).toBe(true);
    subject.observeMic(0.2);
    expect(subject.isThinking(false)).toBe(false);
  });

  it('ignores quiet mic noise', () => {
    const { subject, advance } = tracker();
    subject.observeUserTranscript();
    advance(VOICE_THINKING_QUIET_MS);
    subject.observeMic(0.002);
    expect(subject.isThinking(false)).toBe(true);
  });

  it('never thinks while Memento is speaking, and resets on reply', () => {
    const { subject, advance } = tracker();
    subject.observeUserTranscript();
    advance(VOICE_THINKING_QUIET_MS);
    expect(subject.isThinking(true)).toBe(false);
    subject.reset();
    expect(subject.isThinking(false)).toBe(false);
  });

  it('thinks at once while a tool runs', () => {
    const { subject } = tracker();
    subject.observeToolCall();
    expect(subject.isThinking(false)).toBe(true);
  });

  it('gives up when no reply comes', () => {
    const { subject, advance } = tracker();
    subject.observeUserTranscript();
    advance(VOICE_THINKING_QUIET_MS);
    expect(subject.isThinking(false)).toBe(true);
    advance(VOICE_THINKING_MAX_MS + 1);
    expect(subject.isThinking(false)).toBe(false);
    expect(subject.isThinking(false)).toBe(false);
  });
});
