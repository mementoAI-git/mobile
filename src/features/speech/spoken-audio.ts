import endpoint from '@/api/endpoint';
import { post } from '@/api/mutations';

/** Mirrors web `features/speech/spoken-audio.ts`. */
export interface SpokenAudio {
  audioBase64: string;
  mimeType: 'audio/wav';
  voiceName: string;
}

export async function requestSpokenAudio(text: string, signal?: AbortSignal): Promise<SpokenAudio> {
  const response = await post<SpokenAudio>(endpoint.spokenReply, { text }, { signal, timeout: 50_000 });
  if (response.success === false || !response.data?.audioBase64 || response.data.mimeType !== 'audio/wav') {
    throw new Error('Spoken audio is unavailable.');
  }
  return response.data;
}

/** Plain speakable text in short clips: a quick first clip, then up to 480 characters each (web). */
export function spokenReplyChunks(text: string, firstClipLimit = 200): string[] {
  const plain = text.replace(/```[\s\S]*?(?:```|$)/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-*+]\s+)/gm, '')
    .replace(/[*`~]/g, '').trim();
  const chunks: string[] = [];
  let remaining = plain;
  while (remaining) {
    const limit = chunks.length ? 480 : firstClipLimit;
    if (remaining.length <= limit) { chunks.push(remaining); break; }
    const sample = remaining.slice(0, limit);
    const sentence = Math.max(sample.lastIndexOf('. '), sample.lastIndexOf('! '), sample.lastIndexOf('? '), sample.lastIndexOf('\n'));
    const space = sample.lastIndexOf(' ');
    const end = sentence > 40 ? sentence + 1 : space > 0 ? space : limit;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  return chunks;
}

export function spokenReplyErrorMessage(error: unknown): string {
  const failure = error as { response?: { status?: number }; status?: number } | null;
  const status = failure?.response?.status ?? failure?.status;
  if (status === 404) return 'Voice narration isn’t available on this server yet.';
  if (status === 429) return 'Voice narration is busy right now. Please try again shortly.';
  if (status === 401) return 'Please sign in again to use voice narration.';
  if (status === 403) return 'Voice narration isn’t available for your account.';
  if (status && status >= 500) return 'The speech service is temporarily unavailable. Please try again shortly.';
  return 'Couldn’t read this reply aloud. Check your connection and try again.';
}
