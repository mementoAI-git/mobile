/**
 * Pure helpers for the Overview capture card ("What's on your mind today?"),
 * mirroring web `overview-capture-card.tsx`.
 */

/** A voice note recorded on the card and already uploaded. */
export type CaptureVoiceNote = {
  fileId: string;
  url?: string;
  name: string;
  mimeType: string;
  duration?: number;
};

/** Emitted by the editor once a handed-off draft is published or kept as a story draft. */
export const CAPTURE_HANDED_OFF_EVENT = 'memento:overview-draft-handed-off';

export type CaptureHandedOffEvent = {
  handoffId: string;
  outcome: 'published' | 'draft';
};

export function captureTextKey(userId: string) {
  return `memento-overview-draft:${userId}`;
}

export function captureVoiceKey(userId: string) {
  return `memento-overview-voice:${userId}`;
}

/** Reads saved voice notes, dropping anything malformed. */
export function parseSavedVoiceNotes(raw: string | null | undefined): CaptureVoiceNote[] {
  if (!raw) return [];
  try {
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return [];
    return saved.filter(
      (note): note is CaptureVoiceNote =>
        Boolean(note) && typeof note.fileId === 'string' && note.fileId.length > 0 && typeof note.name === 'string',
    );
  } catch {
    return [];
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** One paragraph per line, as the web card hands text to the story editor. */
export function storyBodyFromText(text: string) {
  return text
    .split('\n')
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

/** Editor `initialDraft` payload for "Use as story". */
export function buildStoryHandoff(handoffId: string, text: string, voiceNotes: CaptureVoiceNote[]) {
  return {
    handoffId,
    body: text.trim() ? storyBodyFromText(text) : '',
    attachments: voiceNotes.map((note) => ({
      id: note.fileId,
      url: note.url ?? '',
      name: note.name,
      type: note.mimeType,
      duration: note.duration,
      isVoice: true,
    })),
  };
}

export type StoryHandoff = ReturnType<typeof buildStoryHandoff>;

export function parseStoryHandoff(raw: string | undefined): StoryHandoff | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed.handoffId !== 'string') return null;
    return {
      handoffId: parsed.handoffId,
      body: typeof parsed.body === 'string' ? parsed.body : '',
      attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
    };
  } catch {
    return null;
  }
}

export function formatVoiceNoteDuration(seconds = 0) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${(whole % 60).toString().padStart(2, '0')}`;
}
