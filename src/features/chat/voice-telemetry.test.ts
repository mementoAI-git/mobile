import { describe, expect, test } from 'bun:test';

import { VOICE_SPEECH_RMS, VoiceLatencyTracker } from './voice-latency';
import {
  reportVoiceCall,
  sampleVoiceTraces,
  VOICE_CALL_SPAN,
  type VoiceTelemetrySentry,
} from './voice-telemetry';

type RecordedSpan = {
  options: Record<string, any>;
  endedAt?: number;
  status?: { code: number; message?: string };
};

function fakeSentry() {
  const spans: RecordedSpan[] = [];
  const measurements: Record<string, { value: number; unit: string; span: unknown }> = {};
  const exceptions: Array<{ error: Error; hint: any }> = [];
  const sentry: VoiceTelemetrySentry = {
    captureException(error, hint) {
      exceptions.push({ error: error as Error, hint });
      return 'event-id';
    },
    startInactiveSpan(options) {
      const record: RecordedSpan = { options };
      spans.push(record);
      return {
        end: (endTime?: number) => {
          record.endedAt = endTime;
        },
        setStatus: (status: { code: number; message?: string }) => {
          record.status = status;
          return undefined as never;
        },
      } as never;
    },
    setMeasurement(name, value, unit, span) {
      measurements[name] = { value, unit: String(unit), span };
    },
  };
  return { sentry, spans, measurements, exceptions };
}

function completedCall() {
  const clock = { now: 1_000 };
  const tracker = new VoiceLatencyTracker(() => clock.now);
  clock.now = 1_100;
  tracker.mark('permission');
  tracker.beginAudioStart();
  clock.now = 1_400;
  tracker.endAudioStart();
  clock.now = 2_000;
  tracker.mark('token');
  clock.now = 2_200;
  tracker.mark('setupComplete');
  clock.now = 2_500;
  tracker.observeModelAudio();
  clock.now = 2_700;
  tracker.observePlaybackStart();
  tracker.observeModelTurnEnd();
  clock.now = 3_000;
  tracker.observeMicFrame(VOICE_SPEECH_RMS * 3);
  clock.now = 4_000;
  tracker.observeModelAudio();
  clock.now = 4_250;
  tracker.observePlaybackStart();
  clock.now = 4_600;
  tracker.observeModelTurnEnd({ interruptedBy: 'speech' });
  return tracker.summary();
}

describe('reportVoiceCall', () => {
  test('sends one root transaction with startup stages and replies as child spans', () => {
    const { sentry, spans, measurements } = fakeSentry();

    reportVoiceCall(
      {
        latency: completedCall(),
        endedAt: 9_000,
        model: 'gemini-live',
        platform: 'ios',
        toolCalls: 0,
        tokenPrefetched: true,
        usage: { lastPromptTokens: 5400, maxTotalTokens: 6100 },
        audioPolicy: { iosVoiceProcessing: true, speakerFullDuplex: false },
        turnDetection: { variant: 'silence-800', silenceDurationMs: 800, prefixPaddingMs: 200 },
        engine: {
          startOutputRoute: 'speaker',
          outputRoute: 'bluetooth-call',
          routeChanges: 3,
          voiceProcessingActive: true,
          uplinkEchoSuppressed: 42,
          bargeIns: 2,
          underruns: 2,
          routeRebuilds: 1,
          concealedMs: 40,
          malformedChunks: 0,
          nativePlayback: true,
          playbackContextSampleRate: 48_000,
        },
      },
      sentry,
    );

    const [root, ...children] = spans;
    expect(root.options).toMatchObject({
      name: VOICE_CALL_SPAN,
      op: 'voice.call',
      startTime: 1_000,
      parentSpan: null,
      forceTransaction: true,
      attributes: {
        'voice.outcome': 'completed',
        'voice.model': 'gemini-live',
        'voice.platform': 'ios',
        'voice.native_playback': true,
        'voice.playback_sample_rate': 48_000,
        'voice.route': 'speaker',
        'voice.route_end': 'bluetooth-call',
        'voice.token_prefetched': true,
        'voice.ios_voice_processing': true,
        'voice.speaker_full_duplex': false,
        'voice.ios_voice_processing_active': true,
        'voice.turn_variant': 'silence-800',
        'voice.silence_ms': 800,
        'voice.prefix_padding_ms': 200,
      },
    });
    expect(root.endedAt).toBe(9_000);
    expect(root.status).toBeUndefined();

    expect(
      children.map(({ options, endedAt }) => [options.name, options.startTime, endedAt]),
    ).toEqual([
      ['voice.startup.permission', 1_000, 1_100],
      ['voice.startup.token', 1_100, 2_000],
      ['voice.startup.setupComplete', 2_000, 2_200],
      ['voice.startup.firstAudio', 2_200, 2_500],
      ['voice.startup.firstPlayback', 2_500, 2_700],
      ['voice.startup.audio', 1_100, 1_400],
      ['voice.turn.response', 3_000, 4_000],
    ]);
    expect(children.every(({ options }) => options.parentSpan !== undefined)).toBe(true);
    expect(children[6].options.attributes).toEqual({
      'voice.tool_call': false,
      'voice.interrupted_by': 'speech',
      'voice.early_interruption': true,
      'voice.audible_ms': 1_250,
    });

    expect(measurements.voice_time_to_first_word).toMatchObject({ value: 1_700, unit: 'millisecond' });
    expect(measurements.voice_startup_token).toMatchObject({ value: 900, unit: 'millisecond' });
    expect(measurements.voice_startup_audio).toMatchObject({ value: 300, unit: 'millisecond' });
    expect(measurements.voice_reply_p50).toMatchObject({ value: 1_000, unit: 'millisecond' });
    expect(measurements.voice_reply_audible_p50).toMatchObject({ value: 1_250 });
    expect(measurements.voice_replies).toMatchObject({ value: 1, unit: 'none' });
    expect(measurements.voice_reply_early_interruptions).toMatchObject({ value: 1, unit: 'none' });
    expect(measurements.voice_interruptions_spoken).toMatchObject({ value: 1, unit: 'none' });
    expect(measurements.voice_interruptions_tapped).toMatchObject({ value: 0, unit: 'none' });
    expect(measurements.voice_underruns).toMatchObject({ value: 2, unit: 'none' });
    expect(measurements.voice_concealed).toMatchObject({ value: 40, unit: 'millisecond' });
    expect(measurements.voice_route_changes).toMatchObject({ value: 3, unit: 'none' });
    expect(measurements.voice_echo_suppressed_frames).toMatchObject({ value: 42, unit: 'none' });
    expect(measurements.voice_barge_ins).toMatchObject({ value: 2, unit: 'none' });
    expect(measurements.voice_prompt_tokens_last).toMatchObject({ value: 5400, unit: 'none' });
    expect(measurements.voice_total_tokens_max).toMatchObject({ value: 6100, unit: 'none' });
    expect(measurements.voice_reply_p50.span).toBeDefined();
  });

  test('marks calls that never reached setup as failed', () => {
    const { sentry, spans } = fakeSentry();
    const tracker = new VoiceLatencyTracker(() => 0);

    reportVoiceCall(
      { latency: tracker.summary(), endedAt: 500, platform: 'android', toolCalls: 0, failed: true },
      sentry,
    );

    expect(spans).toHaveLength(1);
    expect(spans[0].options.attributes['voice.outcome']).toBe('failed');
    expect(spans[0].status).toEqual({ code: 2, message: 'failed' });
  });

  test('reports why a call failed, as span attributes and as a Sentry error', () => {
    const { sentry, spans, exceptions } = fakeSentry();
    const tracker = new VoiceLatencyTracker(() => 0);

    reportVoiceCall(
      {
        latency: tracker.summary(),
        endedAt: 500,
        platform: 'ios',
        toolCalls: 0,
        failure: { step: 'token', message: 'Feature not enabled', status: 403 },
        endedDuringStep: 'token',
      },
      sentry,
    );

    expect(spans[0].options.attributes).toMatchObject({
      'voice.ended_during_step': 'token',
      'voice.outcome': 'failed',
      'voice.failure_step': 'token',
      'voice.failure': 'Feature not enabled',
      'voice.failure_status': 403,
    });
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].error.message).toBe('Voice call failed at token: Feature not enabled');
    expect(exceptions[0].hint).toMatchObject({
      tags: { voice_failure_step: 'token', voice_failure_status: '403' },
    });
  });

  test('keeps failure messages short', () => {
    const { sentry, spans } = fakeSentry();

    reportVoiceCall(
      {
        latency: new VoiceLatencyTracker(() => 0).summary(),
        endedAt: 1,
        platform: 'ios',
        toolCalls: 0,
        failure: { step: 'session', message: 'x'.repeat(500) },
      },
      sentry,
    );

    expect(spans[0].options.attributes['voice.failure']).toHaveLength(200);
  });

  test('never throws when Sentry does', () => {
    const sentry: VoiceTelemetrySentry = {
      captureException: () => '',
      startInactiveSpan: () => {
        throw new Error('sentry down');
      },
      setMeasurement: () => {},
    };

    expect(() =>
      reportVoiceCall(
        { latency: completedCall(), endedAt: 9_000, platform: 'ios', toolCalls: 0 },
        sentry,
      ),
    ).not.toThrow();
  });
});

describe('sampleVoiceTraces', () => {
  test('keeps every voice call and samples everything else at the configured rate', () => {
    const inheritOrSampleWith = (rate: number) => rate;
    expect(sampleVoiceTraces({ name: VOICE_CALL_SPAN, inheritOrSampleWith }, 0.2)).toBe(1);
    expect(sampleVoiceTraces({ name: 'navigation', inheritOrSampleWith }, 0.2)).toBe(0.2);
  });
});
