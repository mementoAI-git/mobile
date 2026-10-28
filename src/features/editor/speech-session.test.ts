import { expect, test } from 'bun:test';
import { SpeechSession } from './speech-session';

test('does not claim recording before native audio capture starts', () => {
  const session = new SpeechSession();
  session.begin();
  expect(session.capturing).toBe(false);
  expect(session.audioStarted()).toBe(true);
  expect(session.capturing).toBe(true);
});
test('silence stays flat and microphone volume drives the waveform', () => {
  const session = new SpeechSession();
  session.begin();
  expect(session.volume(8)).toBeNull();
  session.audioStarted();
  expect(session.volume(-2)?.at(-1)).toBe(0);
  expect(session.volume(7)?.at(-1)).toBe(0.7);
  expect(session.volume(20)?.at(-1)).toBe(1);
});
test('replaces partial results, preserves completed utterances, and commits once', () => {
  const session = new SpeechSession();
  session.begin(); session.audioStarted();
  expect(session.result('Hello', false)).toBe('Hello');
  expect(session.result('Hello world.', true)).toBe('Hello world.');
  expect(session.result('Another', false)).toBe('Hello world. Another');
  expect(session.result('Another sentence.', true)).toBe('Hello world. Another sentence.');
  expect(session.finish()).toBe('Hello world. Another sentence.');
  expect(session.finish()).toBeNull();
});
test('cancel ignores late native results and end events', () => {
  const session = new SpeechSession();
  session.begin(); session.audioStarted(); session.result('Discard this', false);
  session.cancel();
  expect(session.result('Late text', true)).toBeNull();
  expect(session.finish()).toBeNull();
  expect(session.audioStarted()).toBe(false);
});
