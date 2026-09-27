import { describe, expect, test } from 'bun:test';

import { VoiceSessionMetrics } from './voice-session-metrics';

describe('VoiceSessionMetrics', () => {
  test('records latency, queue, interruption, route, and close aggregates', () => {
    let timestamp = 1_000;
    const metrics = new VoiceSessionMetrics(() => timestamp);

    timestamp = 1_080;
    metrics.markOpen();
    timestamp = 1_140;
    metrics.markSetup();
    timestamp = 1_300;
    metrics.markFirstOutput();
    metrics.observeQueueDepth(180);
    metrics.observeQueueDepth(95);
    metrics.observeQueueDepth(260);
    timestamp = 1_345;
    metrics.markPlaybackStart();
    metrics.markUnderrun();
    metrics.markUnderrun();
    timestamp = 1_500;
    metrics.markInterruption();
    metrics.markRouteChange();
    timestamp = 1_535;
    metrics.markSilence();
    timestamp = 2_000;
    metrics.close(1000, 'normal');

    expect(metrics.snapshot()).toEqual({
      connectToOpenMs: 80,
      connectToSetupMs: 140,
      firstOutputToPlaybackMs: 45,
      minQueueDepthMs: 95,
      maxQueueDepthMs: 260,
      underruns: 2,
      interruptionToSilenceMs: 35,
      routeChanges: 1,
      durationMs: 1_000,
      closeCode: 1000,
      closeReason: 'normal',
    });
  });

  test('caps close reasons and cannot retain private payload metadata', () => {
    let timestamp = 0;
    const metrics = new VoiceSessionMetrics(() => timestamp);
    timestamp = 20;
    metrics.close(4000, 'x'.repeat(200));

    const serialized = JSON.stringify(metrics.snapshot());
    expect(metrics.snapshot().closeReason).toHaveLength(120);
    expect(serialized).not.toContain('token');
    expect(serialized).not.toContain('transcript');
    expect(serialized).not.toContain('audio');
    expect(serialized).not.toContain('pcm');
  });
});
