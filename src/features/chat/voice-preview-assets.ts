import type { VoiceId } from './voice-catalog';

/** Web `voice-preview-lines.json`: the sentence each clip index reads. */
export const VOICE_PREVIEW_LINES = [
  'My good opinion once lost, is lost for ever.',
  'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
  'I could easily forgive his pride, if he had not mortified mine.',
  'Till this moment I never knew myself.',
  'Angry people are not always wise.',
  'I declare after all there is no enjoyment like reading!',
] as const;

export type VoicePreviewClip = { line: number; asset: number };

/** Prerecorded samples copied from web, `<voice>-<line>.mp3`. */
export const VOICE_PREVIEW_CLIPS: Record<VoiceId, readonly VoicePreviewClip[]> = {
  denver: [
    { line: 0, asset: require('../../../assets/audio/voice-previews/denver-0.mp3') },
    { line: 1, asset: require('../../../assets/audio/voice-previews/denver-1.mp3') },
    { line: 2, asset: require('../../../assets/audio/voice-previews/denver-2.mp3') },
    { line: 3, asset: require('../../../assets/audio/voice-previews/denver-3.mp3') },
    { line: 4, asset: require('../../../assets/audio/voice-previews/denver-4.mp3') },
    { line: 5, asset: require('../../../assets/audio/voice-previews/denver-5.mp3') },
  ],
  sue: [
    { line: 0, asset: require('../../../assets/audio/voice-previews/sue-0.mp3') },
    { line: 1, asset: require('../../../assets/audio/voice-previews/sue-1.mp3') },
    { line: 2, asset: require('../../../assets/audio/voice-previews/sue-2.mp3') },
    { line: 3, asset: require('../../../assets/audio/voice-previews/sue-3.mp3') },
    { line: 4, asset: require('../../../assets/audio/voice-previews/sue-4.mp3') },
    { line: 5, asset: require('../../../assets/audio/voice-previews/sue-5.mp3') },
  ],
  josef: [
    { line: 0, asset: require('../../../assets/audio/voice-previews/josef-0.mp3') },
    { line: 1, asset: require('../../../assets/audio/voice-previews/josef-1.mp3') },
  ],
  hannah: [
    { line: 0, asset: require('../../../assets/audio/voice-previews/hannah-0.mp3') },
    { line: 1, asset: require('../../../assets/audio/voice-previews/hannah-1.mp3') },
  ],
  maya: [
    { line: 0, asset: require('../../../assets/audio/voice-previews/maya-0.mp3') },
    { line: 1, asset: require('../../../assets/audio/voice-previews/maya-1.mp3') },
  ],
  leo: [
    { line: 0, asset: require('../../../assets/audio/voice-previews/leo-0.mp3') },
  ],
};

/**
 * Web `pickVoicePreviewClip`: a random line for this voice that differs from the
 * line just played (by any voice), so stepping through voices doesn't repeat a
 * sentence. A voice with nothing else recorded plays what it has.
 */
export function pickVoicePreviewClip(
  voiceId: VoiceId,
  previousLine?: number | null,
  random: () => number = Math.random,
): VoicePreviewClip | null {
  const clips = VOICE_PREVIEW_CLIPS[voiceId] ?? [];
  const fresh = clips.filter(({ line }) => line !== previousLine);
  const choices = fresh.length ? fresh : clips;
  return choices[Math.floor(random() * choices.length)] ?? null;
}
