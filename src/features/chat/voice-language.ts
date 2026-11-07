/** Keep in parity with web Chatinput/Voiceinput.tsx. */
export const VOICE_LANGUAGES = [
  { code: 'en-US', label: 'English' },
  { code: 'zh-CN', label: 'Mandarin Chinese' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'ar-SA', label: 'Arabic' },
  { code: 'bn-BD', label: 'Bengali' },
] as const;
export type VoiceLanguageCode = typeof VOICE_LANGUAGES[number]['code'];
export function parseVoiceLanguage(code: unknown): VoiceLanguageCode {
  return VOICE_LANGUAGES.find(language => language.code === code)?.code ?? 'en-US';
}
export function voiceLanguageInstruction(code: VoiceLanguageCode): string {
  const language = VOICE_LANGUAGES.find(language => language.code === code)!;
  return `The host has selected ${language.label} as the conversation language. Respond aloud in ${language.label} for this conversation, including replies to typed chat messages. Preserve names and quoted words as written. Do not announce this setting.`;
}
