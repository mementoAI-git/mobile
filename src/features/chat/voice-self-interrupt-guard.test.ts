import { describe, expect, test } from 'bun:test';

import {
  VOICE_ECHO_MEMORY_MS,
  VOICE_FALLBACK_MAX_MS,
  VOICE_FALLBACK_MS,
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
  test('falls back after Memento twice interrupts itself with its own words', () => {
    const { g, fallbacks } = guard();

    interruption(g, 'So tell me about your grandmother', 'tell me about');
    expect(fallbacks).toHaveLength(0);
    interruption(g, 'What was her kitchen like?', 'her kitchen');

    expect(fallbacks).toHaveLength(1);
    expect(g.suspected).toBe(2);
  });

  test('treats an interruption with nothing transcribed as echo or noise', () => {
    const { g, fallbacks } = guard();

    interruption(g, 'Tell me more', '');
    interruption(g, 'Go on', '');

    expect(fallbacks).toHaveLength(1);
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

  test('backs off longer each time it has to fall back again', () => {
    const { g, durations } = guard();

    interruption(g, 'Tell me more', '');
    interruption(g, 'Go on', '');
    g.restore();
    interruption(g, 'Tell me more', '');
    expect(durations).toEqual([VOICE_FALLBACK_MS]); // one suspect after restoring is not enough
    interruption(g, 'Go on', '');
    g.restore();
    for (let i = 0; i < 2; i += 1) interruption(g, 'And then?', '');
    g.restore();
    for (let i = 0; i < 2; i += 1) interruption(g, 'And then?', '');

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
