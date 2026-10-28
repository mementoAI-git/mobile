import { describe, expect, it } from 'bun:test';

import {
  VOICE_THINKING_MAX_MS,
  VOICE_THINKING_MIN_SPEECH_FRAMES,
  VOICE_THINKING_QUIET_MS,
  VoiceThinkingTracker,
} from './voice-thinking';

/**
 * A quiet room as the simulator heard it: a base around 0.01 with a short
 * spike to 0.03 every second, and a lull that ends in a 400 ms quiet stretch.
 */
function roomNoise(frame: number): number {
  const phase = frame % 25;
  if (phase < 2) return 0.03;
  return phase < 15 ? 0.01 : 0.008;
}

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

  it('steady background noise above the old fixed level is not the user', () => {
    // Seen on the simulator: a quiet room measured 0.013-0.036 and flipped
    // "Thinking" on and off for a minute while nobody spoke.
    const { subject, advance } = tracker();
    for (let i = 0; i < 250; i += 1) {
      subject.observeMic(roomNoise(i));
      advance(40);
      expect(subject.isThinking(false)).toBe(false);
    }
  });

  it('scattered blips do not add up to speech', () => {
    const { subject, advance } = tracker();
    for (let blip = 0; blip < VOICE_THINKING_MIN_SPEECH_FRAMES * 2; blip += 1) {
      subject.observeMic(0.2);
      for (let i = 0; i < 25; i += 1) {
        advance(40);
        subject.observeMic(0.005);
      }
    }
    expect(subject.isThinking(false)).toBe(false);
  });

  it('hears speech over steady background noise, then thinks', () => {
    const { subject, advance } = tracker();
    const frames = (level: number, count: number) => {
      for (let i = 0; i < count; i += 1) {
        subject.observeMic(level);
        advance(40);
      }
    };
    frames(0.02, 75);
    frames(0.08, 25);
    expect(subject.isThinking(false)).toBe(false);
    frames(0.02, 10);
    expect(subject.isThinking(false)).toBe(true);
  });

  it('ignores silence the echo filter sent in place of the mic', () => {
    const { subject, advance } = tracker();
    for (let i = 0; i < 75; i += 1) {
      subject.observeMic(0);
      advance(40);
    }
    // The floor was not dragged to zero, so ordinary noise is still noise.
    for (let i = 0; i < 100; i += 1) {
      subject.observeMic(roomNoise(i));
      advance(40);
      expect(subject.isThinking(false)).toBe(false);
    }
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
