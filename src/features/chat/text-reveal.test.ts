import { expect, test } from 'bun:test';
import { createTextReveal } from './text-reveal';

function setup(immediate = false) {
  const frames: string[] = [];
  const ticks = new Set<() => void>();
  const reveal = createTextReveal({ onText: text => frames.push(text), immediate: () => immediate, schedule: tick => { ticks.add(tick); return () => { ticks.delete(tick); }; } });
  const step = () => { const tick = ticks.values().next().value; if (tick) { ticks.delete(tick); tick(); } };
  const flush = () => { while (ticks.size) step(); };
  return { reveal, frames, ticks, step, flush };
}

test('a complete response is typed progressively and completion waits for its final character', async () => {
  const { reveal, frames, step, flush } = setup();
  reveal.update('Hello there!');
  let done = false;
  const finish = reveal.finish().then(() => { done = true; });
  expect(frames).toEqual([]);
  step();
  expect(frames).toEqual(['He']);
  await Promise.resolve();
  expect(done).toBe(false);
  flush(); await finish;
  expect(frames.at(-1)).toBe('Hello there!');
  expect(done).toBe(true);
});
test('successive streamed chunks retain their order without repeating text', async () => {
  const { reveal, frames, step, flush } = setup();
  reveal.update('Hello'); step();
  reveal.update('Hello, world!');
  const done = reveal.finish(); flush(); await done;
  expect(frames).toEqual(['He', 'Hell', 'Hello,', 'Hello, w', 'Hello, wor', 'Hello, world', 'Hello, world!']);
});
test('cancellation stops queued text and releases anyone waiting for completion', async () => {
  const { reveal, frames, ticks, step, flush } = setup();
  reveal.update('Long reply to stop'); step();
  const done = reveal.finish(); reveal.cancel(); flush(); await done;
  expect(reveal.text).toBe('Lo');
  expect(frames).toEqual(['Lo']);
  expect(ticks.size).toBe(0);
});
test('reduced motion reveals immediately without a typing timer', async () => {
  const { reveal, frames, ticks } = setup(true);
  reveal.update('Hello!'); await reveal.finish();
  expect(frames).toEqual(['Hello!']);
  expect(ticks.size).toBe(0);
});
test('typing does not split emoji or combining characters', async () => {
  const { reveal, frames, step, flush } = setup();
  reveal.update('A👩🏽‍💻é!'); step();
  expect(frames[0]).toBe('A👩🏽‍💻');
  const done = reveal.finish(); flush(); await done;
  expect(frames.at(-1)).toBe('A👩🏽‍💻é!');
});
test('large buffered replies catch up without an excessively long typing wait', async () => {
  const { reveal, frames, flush } = setup();
  const text = 'a'.repeat(10000);
  reveal.update(text);
  const done = reveal.finish(); flush(); await done;
  expect(frames.length).toBeLessThanOrEqual(125);
  expect(frames[0].length).toBeLessThan(text.length);
  expect(frames.at(-1)).toBe(text);
});
test('an empty completed response has no pending timer', async () => {
  const { reveal, ticks } = setup();
  await reveal.finish();
  expect(ticks.size).toBe(0);
});
