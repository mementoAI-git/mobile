import { describe, expect, test } from 'bun:test';

import { tracePropagationTargetsFor } from './sentry-tracing';

describe('tracePropagationTargetsFor', () => {
  test('sends trace headers to the API origin only', () => {
    const [target] = tracePropagationTargetsFor('https://app.mymemento.io/api');

    expect(target.test('https://app.mymemento.io/api/memories')).toBe(true);
    expect(target.test('https://app.mymemento.io/assets/x.png')).toBe(true);
    expect(target.test('https://app.mymemento.io.evil.test/api')).toBe(false);
    expect(target.test('https://dev.mymemento.io/api/memories')).toBe(false);
    expect(target.test('https://bucket.r2.cloudflarestorage.com/upload?sig=1')).toBe(false);
    expect(target.test('https://api.dicebear.com/9.x/adventurer/png')).toBe(false);
  });

  test('keeps the port in the origin', () => {
    const [target] = tracePropagationTargetsFor('http://localhost:3000');

    expect(target.test('http://localhost:3000/users/profile')).toBe(true);
    expect(target.test('http://localhost:8081/index.bundle')).toBe(false);
  });

  test('sends trace headers nowhere when the API URL is not absolute', () => {
    expect(tracePropagationTargetsFor('/api')).toEqual([]);
    expect(tracePropagationTargetsFor('')).toEqual([]);
  });
});
