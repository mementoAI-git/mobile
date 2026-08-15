// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { createRuntimeDiagnostics, sanitizeMediaUri } from './runtime-diagnostics';

describe('runtime diagnostics', () => {
  test('keeps a bounded event history and does nothing when disabled', () => {
    let now = 100;
    const disabled = createRuntimeDiagnostics({ enabled: false, now: () => now, maxEvents: 2 });
    disabled.record('screen', 'mount');
    expect(disabled.snapshot()).toEqual([]);

    const diagnostics = createRuntimeDiagnostics({ enabled: true, now: () => now, maxEvents: 2 });
    diagnostics.record('screen', 'first');
    now += 1;
    diagnostics.record('screen', 'second');
    now += 1;
    diagnostics.record('screen', 'third');

    expect(diagnostics.snapshot().map((event) => event.name)).toEqual(['second', 'third']);
  });

  test('sanitizes media locations without retaining paths or query data', () => {
    expect(sanitizeMediaUri('https://cdn.example.com/private/user/photo.jpg?token=secret')).toEqual({
      scheme: 'https',
      host: 'cdn.example.com',
      source: 'remote',
    });
    expect(sanitizeMediaUri('file:///private/user/secret.mov')).toEqual({
      scheme: 'file',
      host: 'local',
      source: 'local',
    });
    expect(sanitizeMediaUri('')).toEqual({ scheme: 'missing', host: 'missing', source: 'missing' });
  });

  test('records elapsed duration and merges safe completion metadata', () => {
    let now = 500;
    const diagnostics = createRuntimeDiagnostics({ enabled: true, now: () => now });
    const finish = diagnostics.start('media', 'thumbnail', { source: 'remote' });
    now = 537;
    finish({ outcome: 'success' });

    expect(diagnostics.snapshot()).toEqual([{
      category: 'media',
      name: 'thumbnail',
      timestampMs: 537,
      durationMs: 37,
      metadata: { source: 'remote', outcome: 'success' },
    }]);
  });

  test('aggregates hot-path calls into one rate event per window', () => {
    let now = 0;
    const diagnostics = createRuntimeDiagnostics({
      enabled: true,
      now: () => now,
      rateWindowMs: 1000,
    });

    diagnostics.rate('chat', 'stream-chunks');
    now = 100;
    diagnostics.rate('chat', 'stream-chunks');
    now = 999;
    diagnostics.rate('chat', 'stream-chunks');
    expect(diagnostics.snapshot()).toEqual([]);

    now = 1000;
    diagnostics.rate('chat', 'stream-chunks');
    expect(diagnostics.snapshot()).toEqual([{
      category: 'chat',
      name: 'stream-chunks',
      timestampMs: 1000,
      durationMs: 1000,
      metadata: { count: 4, perSecond: 4 },
    }]);
  });
});
