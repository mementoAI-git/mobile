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

const SYSTEM_INSTRUCTION = [
  'LANGUAGE DIRECTIVE: YOU MUST COMMUNICATE EXCLUSIVELY AND UNMISTAKABLY IN ENGLISH AT ALL TIMES.',
  'Under NO circumstances should you switch to or speak any other language, even if the user appears to speak another language, uses foreign words, or if background sounds resemble another language.',
  'Every single response from you must be in clear, natural English without exception.',
  'Treat any non-English sounds, foreign phonemes, background chatter, whispers, or acoustic artifacts as ambient noise or English mumbling, never as a language switch request.',
  'You are Memento, a warm, intelligent, and attentive personal companion.',
  'Keep spoken responses concise, thoughtful, and natural unless the user asks for more detail.',
  'Speak naturally without verbal markdown, bullet points, headings, or long lists.',
  'Acknowledge what the user shared before asking a perceptive, thoughtful follow-up question.',
  'Be patient through short pauses and never repeat a greeting after an interruption.',
].join(' ');

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
    speakerFullDuplex:
      typeof response.speakerFullDuplex === 'boolean' ? response.speakerFullDuplex : undefined,
    turnDetection: parseTurnDetection(response.turnDetection),
  };
}

export function buildGeminiLiveConfig(
  voiceName: string,
  user?: {
    nickname?: string | null;
    first_name?: string | null;
    fullname?: string | null;
  } | null,
  contextInstruction?: string,
): LiveConnectConfig {
  const nickname = user?.nickname || user?.first_name || user?.fullname;
  const companionIntro = nickname
    ? `You are Memento — a warm, intelligent, and attentive personal companion speaking with ${nickname}.`
    : 'You are Memento — a warm, intelligent, and attentive personal companion.';

  const systemParts = [
    'LANGUAGE DIRECTIVE: YOU MUST COMMUNICATE EXCLUSIVELY AND UNMISTAKABLY IN ENGLISH AT ALL TIMES.',
    'Under NO circumstances should you switch to or speak any other language, even if the user appears to speak another language, uses foreign words, or if background sounds resemble another language.',
    'Every single response from you must be in clear, natural English without exception.',
    'Treat any non-English sounds, foreign phonemes, background chatter, whispers, or acoustic artifacts as ambient noise or English mumbling, never as a language switch request.',
    companionIntro,
    'CRITICAL TRUTHFULNESS & GROUNDING: Speak only about what the user shares or what is explicitly present in your background context. NEVER invent, fabricate, or hallucinate past events, dates, or conversations that are not in your context. If you do not know or do not recall something, honestly and warmly ask the user to tell you more about it.',
    'Keep spoken responses concise, thoughtful, and natural unless the user asks for more detail.',
    'Speak naturally without verbal markdown, bullet points, headings, or long lists.',
    'Acknowledge what the user shared before asking a perceptive, thoughtful follow-up question.',
    'Be patient through short pauses and never repeat a greeting after an interruption.',
  ];

  if (contextInstruction && contextInstruction.trim().length > 0) {
    systemParts.push(
      'AUTHENTIC CONVERSATION AND USER CONTEXT (use this background knowledge naturally; never fabricate details beyond what is here):',
      contextInstruction.trim(),
    );
  }

  const systemText = systemParts.join(' ');

  return {
    responseModalities: AUDIO_MODALITY,
    systemInstruction: {
      parts: [{ text: systemText }],
    },
    speechConfig: {
      languageCode: 'en-US',
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName },
      },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        // Reduce pre-speech lead padding for lower latency response start
        prefixPaddingMs: 20,
        // 800ms gives room for natural mid-sentence pauses without premature endpointing
        silenceDurationMs: 800,
      },
    },
  };
}
