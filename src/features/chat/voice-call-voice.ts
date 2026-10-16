import { VOICE_CATALOG, type VoiceDefinition, type VoiceId } from './voice-catalog';

/**
 * The server locks the call voice from the profile's `chat_voice`, not from
 * anything the app sends with the token request. So a voice choice only takes
 * effect once it is saved to the profile.
 */

type ProfileVoice = {
  chat_voice?: string | null;
  chat_voice_provider?: string | null;
};

/** Same matching as the API's resolveGeminiVoiceName. */
export function profileUsesVoice(
  profile: ProfileVoice | null | undefined,
  voice: VoiceDefinition,
): boolean {
  const saved = profile?.chat_voice?.trim().toLowerCase();
  if (!saved) return false;
  if (profile?.chat_voice_provider && profile.chat_voice_provider !== 'gemini') return false;
  return saved === voice.id || saved === voice.providerVoiceName.toLowerCase();
}

/** The voice the profile already has saved for calls, if it is one we offer. */
export function savedCallVoice(profile: ProfileVoice | null | undefined): VoiceDefinition | undefined {
  return VOICE_CATALOG.find((voice) => profileUsesVoice(profile, voice));
}

export function voiceProfileUpdate(voice: VoiceDefinition) {
  return { chat_voice: voice.providerVoiceName, chat_voice_provider: 'gemini' as const };
}

/**
 * Saves the voice to the server profile, then locally. The local choice only
 * changes once the server accepted it, so what the screen shows matches the
 * voice the next call will use.
 */
export async function saveCallVoice(
  voice: VoiceDefinition,
  deps: {
    saveProfile: (payload: ReturnType<typeof voiceProfileUpdate>) => Promise<unknown>;
    saveLocal: (id: VoiceId) => Promise<void>;
  },
): Promise<void> {
  await deps.saveProfile(voiceProfileUpdate(voice));
  await deps.saveLocal(voice.id);
}
