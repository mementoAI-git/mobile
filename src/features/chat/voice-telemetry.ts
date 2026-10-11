import type * as SentryModule from '@sentry/react-native';

import type { VoiceAudioEngineSnapshot } from './voice-audio-engine';
import type { VoiceLatencyStats, VoiceLatencySummary } from './voice-latency';
import type { VoiceTurnDetection } from './voice-live-config';

/**
 * Sends one Sentry transaction per voice call. Startup stages and each reply
 * become child spans with their real timestamps, so the trace view shows the
 * call as a waterfall. Measurements on the root make the numbers chartable
 * (p50/p95 of `voice_reply_p50`, `voice_time_to_first_word`, ...).
 *
 * No transcript text or audio is ever sent.
 */

export const VOICE_CALL_SPAN = 'voice.call';

/** Sentry's SPAN_STATUS_ERROR. */
const SPAN_STATUS_ERROR = 2;

export type VoiceTelemetrySentry = Pick<
  typeof SentryModule,
  'startInactiveSpan' | 'setMeasurement' | 'captureException'
>;

/** Where and why a call failed to start or broke off. */
export type VoiceCallFailure = {
  /** The connect step that failed, e.g. token, session, audio. */
  step: string;
  message: string;
  /** HTTP status when the failure was an API error. */
  status?: number;
};

const MAX_FAILURE_MESSAGE = 200;

export type VoiceCallEngineStats = Partial<
  Pick<
    VoiceAudioEngineSnapshot,
    | 'underruns'
    | 'routeRebuilds'
    | 'concealedMs'
    | 'malformedChunks'
    | 'nativePlayback'
    | 'playbackContextSampleRate'
    | 'startOutputRoute'
    | 'outputRoute'
    | 'routeChanges'
    | 'voiceProcessingActive'
    | 'uplinkEchoSuppressed'
    | 'bargeIns'
  >
>;

export type VoiceCallReport = {
  latency: VoiceLatencySummary;
  endedAt: number;
  platform: string;
  toolCalls: number;
  model?: string;
  /** The token was fetched before the user tapped call. */
  tokenPrefetched?: boolean;
  /**
   * Gemini's reported token usage. Whether its counts are per response or
   * running totals is not documented, so report the latest prompt size
   * (context growth) and the largest total seen.
   */
  usage?: { lastPromptTokens?: number; maxTotalTokens?: number };
  /** Echo cancellation and mic-open-during-playback settings for this call. */
  audioPolicy?: { iosVoiceProcessing: boolean; speakerFullDuplex: boolean };
  turnDetection?: VoiceTurnDetection;
  engine?: VoiceCallEngineStats;
  /** The call ended on an error rather than a hang-up. */
  failed?: boolean;
  failure?: VoiceCallFailure;
  /** Set when the call ended before it connected: the step it was on. */
  endedDuringStep?: string;
};

/**
 * `tracesSampler` for Sentry.init: every voice call is kept, other traces
 * keep the configured rate. Voice calls are rare enough to afford this.
 */
export function sampleVoiceTraces(
  context: { name: string; inheritOrSampleWith: (fallbackRate: number) => number },
  rate: number,
): number {
  return context.name === VOICE_CALL_SPAN ? 1 : context.inheritOrSampleWith(rate);
}

export function reportVoiceCall(
  report: VoiceCallReport,
  sentry: VoiceTelemetrySentry = loadSentry(),
): void {
  try {
    sendVoiceCall(report, sentry);
  } catch {
    // Telemetry must never break hanging up.
  }
}

function sendVoiceCall(report: VoiceCallReport, sentry: VoiceTelemetrySentry): void {
  const { latency, engine } = report;
  const reachedSetup = latency.stages.some((stage) => stage.name === 'setupComplete');
  const failure = report.failure && {
    ...report.failure,
    message: report.failure.message.slice(0, MAX_FAILURE_MESSAGE),
  };
  const failed = Boolean(failure) || (report.failed ?? !reachedSetup);

  const root = sentry.startInactiveSpan({
    name: VOICE_CALL_SPAN,
    op: 'voice.call',
    startTime: latency.startedAt,
    parentSpan: null,
    forceTransaction: true,
    attributes: definedOnly({
      'voice.outcome': failed ? 'failed' : 'completed',
      'voice.failure_step': failure?.step,
      'voice.failure': failure?.message,
      'voice.failure_status': failure?.status,
      'voice.ended_during_step': report.endedDuringStep,
      'voice.model': report.model,
      'voice.platform': report.platform,
      'voice.native_playback': engine?.nativePlayback,
      'voice.playback_sample_rate': engine?.playbackContextSampleRate,
      'voice.route': engine?.startOutputRoute,
      'voice.route_end': engine?.outputRoute,
      'voice.token_prefetched': report.tokenPrefetched,
      'voice.ios_voice_processing': report.audioPolicy?.iosVoiceProcessing,
      'voice.speaker_full_duplex': report.audioPolicy?.speakerFullDuplex,
      'voice.ios_voice_processing_active': engine?.voiceProcessingActive,
      'voice.turn_variant': report.turnDetection?.variant,
      'voice.silence_ms': report.turnDetection?.silenceDurationMs,
      'voice.prefix_padding_ms': report.turnDetection?.prefixPaddingMs,
    }),
  });

  for (const stage of latency.stages) {
    sentry
      .startInactiveSpan({
        name: `voice.startup.${stage.name}`,
        op: 'voice.startup',
        parentSpan: root,
        startTime: stage.startAt,
      })
      .end(stage.endAt);
  }

  if (latency.audioStart) {
    sentry
      .startInactiveSpan({
        name: 'voice.startup.audio',
        op: 'voice.startup',
        parentSpan: root,
        startTime: latency.audioStart.startAt,
      })
      .end(latency.audioStart.endAt);
  }

  for (const turn of latency.turns) {
    sentry
      .startInactiveSpan({
        name: 'voice.turn.response',
        op: 'voice.turn',
        parentSpan: root,
        startTime: turn.speechEndAt,
        attributes: definedOnly({
          'voice.tool_call': turn.toolCall,
          'voice.interrupted_by': turn.interruptedBy,
          'voice.early_interruption': turn.earlyInterruption,
          'voice.audible_ms': turn.audibleMs,
          'voice.transcript_to_audio_ms': turn.transcriptToAudioMs,
        }),
      })
      .end(turn.firstAudioAt);
  }

  const measure = (name: string, value: number | undefined, unit: 'millisecond' | 'none') => {
    if (value !== undefined && Number.isFinite(value)) {
      sentry.setMeasurement(name, value, unit, root);
    }
  };

  measure('voice_time_to_first_word', latency.timeToFirstWordMs, 'millisecond');
  for (const stage of latency.stages) {
    measure(`voice_startup_${stage.name}`, stage.durationMs, 'millisecond');
  }
  measure('voice_startup_audio', latency.audioStart?.durationMs, 'millisecond');
  measureStats(measure, 'voice_reply', latency.turnStats.response);
  measureStats(measure, 'voice_reply_audible', latency.turnStats.audible);
  measure('voice_replies', latency.turnStats.response.count, 'none');
  measure('voice_reply_early_interruptions', latency.turnStats.earlyInterruptions, 'none');
  measure('voice_interruptions_spoken', latency.turnStats.interruptions.speech, 'none');
  measure('voice_interruptions_tapped', latency.turnStats.interruptions.tap, 'none');
  measure('voice_tool_calls', report.toolCalls, 'none');
  measure('voice_underruns', engine?.underruns, 'none');
  measure('voice_route_rebuilds', engine?.routeRebuilds, 'none');
  measure('voice_route_changes', engine?.routeChanges, 'none');
  measure('voice_echo_suppressed_frames', engine?.uplinkEchoSuppressed, 'none');
  measure('voice_barge_ins', engine?.bargeIns, 'none');
  measure('voice_prompt_tokens_last', report.usage?.lastPromptTokens, 'none');
  measure('voice_total_tokens_max', report.usage?.maxTotalTokens, 'none');
  measure('voice_malformed_chunks', engine?.malformedChunks, 'none');
  measure('voice_concealed', engine?.concealedMs, 'millisecond');

  if (failed) root.setStatus({ code: SPAN_STATUS_ERROR, message: 'failed' });
  if (failure) {
    // Also an Issue, so failed calls alert and group by cause.
    sentry.captureException(new Error(`Voice call failed at ${failure.step}: ${failure.message}`), {
      tags: definedOnly({
        voice_failure_step: failure.step,
        voice_failure_status: failure.status === undefined ? undefined : String(failure.status),
      }),
    });
  }
  root.end(report.endedAt);
}

function measureStats(
  measure: (name: string, value: number | undefined, unit: 'millisecond') => void,
  prefix: string,
  stats: VoiceLatencyStats,
): void {
  measure(`${prefix}_p50`, stats.p50Ms, 'millisecond');
  measure(`${prefix}_p90`, stats.p90Ms, 'millisecond');
  measure(`${prefix}_max`, stats.maxMs, 'millisecond');
}

function definedOnly<T extends Record<string, string | number | boolean | undefined>>(
  values: T,
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function loadSentry(): VoiceTelemetrySentry {
  // Required lazily so unit tests never load the native SDK.
  return require('@sentry/react-native') as typeof SentryModule;
}
