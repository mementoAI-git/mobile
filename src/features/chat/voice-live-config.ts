import type { LiveConnectConfig, Modality } from '@google/genai/web';

/**
 * Response modality for live sessions. Kept as a literal (instead of a
 * `Modality` value import) so `@google/genai/web` stays out of the startup
 * bundle — the SDK is loaded dynamically when a voice session opens.
 * Must match `Modality.AUDIO` ("AUDIO") in the installed SDK release.
 */
const AUDIO_MODALITY: LiveConnectConfig['responseModalities'] = ['AUDIO' as Modality];

export type VoiceLiveToken = {
  token: string;
  model: string;
  voiceName: string;
  systemInstruction?: string;
  greetingInstruction?: string;
  memoryId?: string;
  /** True when the API records voice turns via POST /ai/voice/turns. */
  supportsVoiceTurns: boolean;
  /** Tools the API locked into this session, for example ['search_memories']. */
  tools?: string[];
  /** Tools to forward to POST /ai/voice/tools/:name. Empty on older APIs. */
  serverTools: string[];
  /** Server device policy. Undefined on APIs that predate it. */
  speakerFullDuplex?: boolean;
  /** Turn detection the API locked into the session. Undefined on older APIs. */
  turnDetection?: VoiceTurnDetection;
};

export type VoiceTurnDetection = {
  variant?: string;
  silenceDurationMs?: number;
  prefixPaddingMs?: number;
};

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseTurnDetection(value: unknown): VoiceTurnDetection | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const detection = value as Record<string, unknown>;
  return {
    variant: nonEmptyString(detection.variant) ? detection.variant : undefined,
    silenceDurationMs: finiteNumber(detection.silenceDurationMs),
    prefixPaddingMs: finiteNumber(detection.prefixPaddingMs),
  };
}

export const LEGACY_LIVE_MODEL =
  'gemini-2.5-flash-native-audio-preview-09-2025';

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function parseVoiceLiveToken(
  data: unknown,
  fallbackVoiceName: string,
): VoiceLiveToken {
  const response = data && typeof data === 'object'
    ? data as Record<string, unknown>
    : {};
  if (!nonEmptyString(response.token)) {
    throw new Error('Voice session token was not returned');
  }

  const live = response.live && typeof response.live === 'object'
    ? response.live as Record<string, unknown>
    : {};
  const voice = live.voice && typeof live.voice === 'object'
    ? live.voice as Record<string, unknown>
    : {};

  return {
    token: response.token,
    model: nonEmptyString(live.model) ? live.model : LEGACY_LIVE_MODEL,
    voiceName: nonEmptyString(voice.name) ? voice.name : fallbackVoiceName,
    systemInstruction: nonEmptyString(response.systemInstruction)
      ? (response.systemInstruction as string)
      : undefined,
    greetingInstruction: nonEmptyString(response.greetingInstruction)
      ? response.greetingInstruction
      : undefined,
    memoryId:
      nonEmptyString(response.memoryId) && /^[0-9a-fA-F]{24}$/.test(response.memoryId)
        ? response.memoryId
        : undefined,
    supportsVoiceTurns: nonEmptyString(response.promptVersion),
    tools: Array.isArray(response.tools)
      ? response.tools.filter((tool): tool is string => typeof tool === 'string')
      : undefined,
    serverTools: Array.isArray(response.serverTools)
      ? response.serverTools.filter(
          (tool): tool is string => typeof tool === 'string' && /^[a-z_]{1,64}$/.test(tool),
        )
      : [],
    speakerFullDuplex:
      typeof response.speakerFullDuplex === 'boolean' ? response.speakerFullDuplex : undefined,
    turnDetection: parseTurnDetection(response.turnDetection),
  };
}

/**
 * The config the SDK requires when connecting. The ephemeral token locks the
 * real session config on the server (prompt, voice, turn detection, tools),
 * and Gemini ignores this one, so it only names the voice and transcription.
 */
export function buildGeminiLiveConfig(voiceName: string): LiveConnectConfig {
  return {
    responseModalities: AUDIO_MODALITY,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName },
      },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };
}
