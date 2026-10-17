import { describe, expect, test } from 'bun:test';

import {
  shouldRestore,
  VOICE_ECHO_MEMORY_MS,
  VOICE_FALLBACK_MAX_MS,
  VOICE_FALLBACK_MS,
  VOICE_ONSET_INTERRUPT_MS,
  VOICE_RESTORE_ECHO_FLOOR,
  VOICE_RESTORE_MIN_MEASURED_S,
  VoiceSelfInterruptGuard,
} from './voice-self-interrupt-guard';

function guard() {
  const clock = { now: 0 };
  const fallbacks: number[] = [];
  const durations: number[] = [];
  const g = new VoiceSelfInterruptGuard({
    now: () => clock.now,
    onFallback: (durationMs) => {
      fallbacks.push(clock.now);
      durations.push(durationMs);
    },
  });
  return { clock, fallbacks, durations, g };
}

// Memento says something, gets interrupted, Gemini transcribes what it heard,
// then Memento starts answering that.
function interruption(g: VoiceSelfInterruptGuard, said: string, heard: string, onSpeaker = true) {
  g.observeOutputText(said);
  g.observeInterrupted(onSpeaker);
  if (heard) g.observeInputText(heard);
  g.observeModelAudio();
}

describe('VoiceSelfInterruptGuard', () => {
  // At high volume one self-interruption is followed by more, each cutting
  // Memento off mid-sentence: the first one is enough.
  test('falls back the first time Memento interrupts itself with its own words', () => {
    const { g, fallbacks } = guard();

    interruption(g, 'So tell me about your grandmother', 'tell me about');

    expect(fallbacks).toHaveLength(1);
    expect(g.suspected).toBe(1);
  });

  test('treats an interruption with nothing transcribed as echo or noise', () => {
    const { g, fallbacks } = guard();

    interruption(g, 'Tell me more', '');

    expect(fallbacks).toHaveLength(1);
  });

  test('counts a cut-off right as Memento starts talking as echo, whatever was transcribed', () => {
    const { g, fallbacks } = guard();
    g.observeOutputText('So tell me about your grandmother');
    // Distorted echo can transcribe as different words.
    g.observeInterrupted(true, VOICE_ONSET_INTERRUPT_MS - 1);
    g.observeInputText('actually it was my aunt');
    g.observeModelAudio();

    expect(fallbacks).toHaveLength(1);
    expect(g.onsetInterruptions).toBe(1);
  });

  test('judges a later cut-off by its words, so a real interruption still works', () => {
    const { g, fallbacks } = guard();
    g.observeOutputText('So tell me about your grandmother');
    g.observeInterrupted(true, VOICE_ONSET_INTERRUPT_MS + 500);
    g.observeInputText('actually it was my aunt');
    g.observeModelAudio();

    expect(fallbacks).toHaveLength(0);
    expect(g.onsetInterruptions).toBe(0);
  });

  test('a real interruption is not echo, even a short one', () => {
    const { g, fallbacks } = guard();

    interruption(g, 'So tell me about your grandmother', 'wait');
    interruption(g, 'Of course, take your time', 'actually it was my aunt');
    interruption(g, 'Your aunt, lovely', 'no stop');

    expect(fallbacks).toHaveLength(0);
    expect(g.suspected).toBe(0);
  });

  test('counts words heard across several transcript pieces', () => {
    const { g } = guard();
    g.observeOutputText('So tell me');
    g.observeOutputText(' about your grandmother');
    g.observeInterrupted(true);
    g.observeInputText('about your');
    g.observeInputText(' grandmother');
    g.observeModelAudio();

    expect(g.suspected).toBe(1);
  });

  test('uses the live partial transcript when no final one arrived', () => {
    const { g } = guard();
    g.observeOutputText('Tell me about your grandmother');
    g.observeInterrupted(true);
    g.observeInputText('tell', true);
    g.observeInputText('tell me about', true);
    g.observeModelAudio();

    expect(g.suspected).toBe(1);
  });

  test('ignores case and punctuation when matching', () => {
    const { g } = guard();
    interruption(g, 'Tell me, what happened next?', 'What happened next');
    expect(g.suspected).toBe(1);
  });

  test('only judges interruptions on the loudspeaker with full duplex', () => {
    const { g, fallbacks } = guard();

    interruption(g, 'Tell me about it', '', false);
    interruption(g, 'Go on then', '', false);

    expect(fallbacks).toHaveLength(0);
    expect(g.suspected).toBe(0);
  });

  test('only matches what Memento said recently', () => {
    const { clock, g } = guard();
    g.observeOutputText('grandmother kitchen');
    clock.now += VOICE_ECHO_MEMORY_MS + 1;

    g.observeOutputText('Anything else');
    g.observeInterrupted(true);
    g.observeInputText('grandmother kitchen');
    g.observeModelAudio();

    expect(g.suspected).toBe(0);
  });

  test('falls back once, until restored', () => {
    const { g, fallbacks } = guard();
    for (let i = 0; i < 4; i += 1) interruption(g, 'Tell me more', '');
    expect(fallbacks).toHaveLength(1);
  });

  test('waits longer before its first echo check each time it has to fall back again', () => {
    const { g, durations } = guard();

    for (let round = 0; round < 4; round += 1) {
      interruption(g, 'Tell me more', '');
      g.restore();
    }

    expect(durations).toEqual([
      VOICE_FALLBACK_MS,
      VOICE_FALLBACK_MS * 2,
      VOICE_FALLBACK_MAX_MS,
      VOICE_FALLBACK_MAX_MS,
    ]);
  });

  test('waits for Memento to answer before judging, so the user can finish speaking', () => {
    const { g } = guard();
    g.observeOutputText('So tell me about your grandmother');
    g.observeInterrupted(true);
    g.observeInputText('grandmother');

    expect(g.suspected).toBe(0);
    g.observeInputText(' was born in Lagos in 1931');
    g.observeModelAudio();
    expect(g.suspected).toBe(0);
  });
});

describe('shouldRestore', () => {
  test('listens while Memento talks again once the echo has halved', () => {
    expect(shouldRestore(0.09, 0.04, 3)).toBe(true);
  });

  test('keeps the mic closed while the echo is still loud (volume still up)', () => {
    expect(shouldRestore(0.09, 0.08, 3)).toBe(false);
  });

  test('restores when the echo is too faint to matter, whatever it was before', () => {
    expect(shouldRestore(0.02, VOICE_RESTORE_ECHO_FLOOR, 3)).toBe(true);
  });

  test('does not trust a low reading before hearing Memento speak for a moment', () => {
    expect(shouldRestore(0.09, 0, VOICE_RESTORE_MIN_MEASURED_S - 0.1)).toBe(false);
  });
});
