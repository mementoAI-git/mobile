import { describe, expect, test } from 'bun:test';

import { STREAM_MAX_LAG_MS, STREAM_WORDS_PER_SECOND, StreamPacer } from './stream-pacer';

function pacer() {
  let now = 0;
  const subject = new StreamPacer(() => now);
  return { subject, advance: (ms: number) => (now += ms) };
}

const words = (count: number) => Array.from({ length: count }, (_, i) => `w${i}`).join(' ');

describe('StreamPacer', () => {
  test('a reply that arrives all at once is revealed word by word', () => {
    const { subject, advance } = pacer();
    subject.receive('The sun rose slowly over Lagos lagoon.');

    expect(subject.tick()).toBe('The');
    advance(1_000 / STREAM_WORDS_PER_SECOND);
    expect(subject.tick()).toBe('The sun');
    advance(1_000 / STREAM_WORDS_PER_SECOND);
    expect(subject.tick()).toBe('The sun rose');
    expect(subject.isCaughtUp()).toBe(false);
  });

  test('shows the whole reply once enough time has passed', () => {
    const { subject, advance } = pacer();
    subject.receive('One two three.');
    subject.tick();
    advance(1_000);
    expect(subject.tick()).toBe('One two three.');
    expect(subject.isCaughtUp()).toBe(true);
  });

  test('speeds up so a long reply never lags far behind', () => {
    const { subject, advance } = pacer();
    subject.receive(words(300));
    subject.tick();
    advance(STREAM_MAX_LAG_MS + 50);
    subject.tick();
    expect(subject.isCaughtUp()).toBe(true);
  });

  test('keeps pace as more arrives', () => {
    const { subject, advance } = pacer();
    subject.receive('Hello');
    expect(subject.tick()).toBe('Hello');
    subject.receive('Hello there, friend');
    advance(1_000 / STREAM_WORDS_PER_SECOND);
    expect(subject.tick()).toBe('Hello there,');
  });

  test('flush shows everything at once', () => {
    const { subject } = pacer();
    subject.receive(words(50));
    subject.tick();
    expect(subject.flush()).toBe(words(50));
    expect(subject.isCaughtUp()).toBe(true);
  });

  test('a replaced text restarts from what still matches', () => {
    const { subject, advance } = pacer();
    subject.receive('Hello world');
    subject.tick();
    advance(1_000);
    subject.tick();
    subject.receive('Hello there');
    expect(subject.shown()).toBe('Hello ');
  });
});
