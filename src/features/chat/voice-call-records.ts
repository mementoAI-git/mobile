import endpoint from '@/api/endpoint';

export type VoiceCallSummary = {
  text: string;
  keyPoints: string[];
};

export const VOICE_SUMMARY_ERROR_TEXT = "Couldn't summarize. Tap to try again.";

function withSessionId(path: string, sessionId: string): string {
  return path.replace(':sessionId', encodeURIComponent(sessionId));
}

export function voiceCallEndPath(sessionId: string): string {
  return withSessionId(endpoint.voiceCallEnd, sessionId);
}

export function voiceCallSummaryPath(sessionId: string): string {
  return withSessionId(endpoint.voiceCallSummary, sessionId);
}

export function buildVoiceCallEndBody(
  durationSeconds: number,
  memoryId?: string,
): { duration_seconds: number; memory_id?: string } {
  const duration = Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0;
  return {
    duration_seconds: Math.round(duration),
    ...(memoryId ? { memory_id: memoryId } : {}),
  };
}

/** Reads `data` of POST /ai/voice/calls/:sessionId/summary. */
export function parseVoiceCallSummary(data: unknown): VoiceCallSummary | null {
  const summary = (data as { summary?: unknown } | null | undefined)?.summary as
    | { text?: unknown; key_points?: unknown }
    | undefined;
  if (!summary || typeof summary.text !== 'string' || !summary.text.trim()) return null;
  const keyPoints = Array.isArray(summary.key_points)
    ? summary.key_points
        .filter((point): point is string => typeof point === 'string')
        .map((point) => point.trim())
        .filter(Boolean)
    : [];
  return { text: summary.text.trim(), keyPoints };
}
