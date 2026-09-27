import { Modality } from '@google/genai/web';
import type { LiveConnectConfig } from '@google/genai/web';

export type VoiceLiveToken = {
  token: string;
  model: string;
  voiceName: string;
};

export const LEGACY_LIVE_MODEL =
  'gemini-2.5-flash-native-audio-preview-09-2025';

const SYSTEM_INSTRUCTION = [
  'You are Memento, a warm and attentive conversational companion.',
  'Keep spoken responses brief unless the user asks for more detail.',
  'Speak naturally without verbal markdown, headings, or long lists.',
  'Acknowledge what the user said before asking a useful follow-up question.',
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
  };
}

export function buildGeminiLiveConfig(voiceName: string): LiveConnectConfig {
  return {
    responseModalities: [Modality.AUDIO],
    systemInstruction: SYSTEM_INSTRUCTION,
    speechConfig: {
      languageCode: 'en-US',
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName },
      },
    },
    inputAudioTranscription: { languageCodes: ['en-US'] },
    outputAudioTranscription: { languageCodes: ['en-US'] },
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        prefixPaddingMs: 40,
        silenceDurationMs: 650,
      },
    },
  };
}
