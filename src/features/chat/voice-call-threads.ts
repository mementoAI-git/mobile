import type { ChatListMessage } from './message-list';
import { formatVoiceCallDuration } from './voice-call-flow';
import { serializeVoiceCallTranscript } from './voice-transcript-parser';

/**
 * Voice calls are saved one message per turn (POST /ai/voice/turns), each
 * tagged with the call's voice_session_id. Fold every call into a single
 * synthetic "Voice call completed" message, placed where the call started,
 * so the chat shows one expandable VoiceCallCard per call.
 */
export function groupVoiceCallThreads<T extends ChatListMessage>(messages: T[]): T[] {
  const turnsBySession = new Map<string, T[]>();
  for (const message of messages) {
    const sessionId = voiceSessionOf(message);
    if (!sessionId) continue;
    const turns = turnsBySession.get(sessionId) ?? [];
    turns.push(message);
    turnsBySession.set(sessionId, turns);
  }
  if (turnsBySession.size === 0) return messages;

  const result: T[] = [];
  const emitted = new Set<string>();
  for (const message of messages) {
    const sessionId = voiceSessionOf(message);
    if (!sessionId) {
      result.push(message);
      continue;
    }
    if (emitted.has(sessionId)) continue;
    emitted.add(sessionId);
    result.push(buildCallMessage(sessionId, turnsBySession.get(sessionId) ?? [message]));
  }
  return result;
}

function voiceSessionOf(message: ChatListMessage): string | undefined {
  return message.is_voice && message.voice_session_id ? message.voice_session_id : undefined;
}

function buildCallMessage<T extends ChatListMessage>(sessionId: string, turns: T[]): T {
  const ordered = [...turns].sort(
    (a, b) => (a.voice_turn_index ?? 0) - (b.voice_turn_index ?? 0),
  );
  const times = ordered
    .map((turn) => Date.parse(turn.created_at ?? ''))
    .filter((time) => Number.isFinite(time));
  const savedSeconds = Math.max(0, ...ordered.map((turn) => turn.duration ?? 0));
  const estimatedSeconds = times.length ? (Math.max(...times) - Math.min(...times)) / 1_000 : 0;
  const seconds = savedSeconds > 0 ? savedSeconds : estimatedSeconds;
  const text = serializeVoiceCallTranscript(
    formatVoiceCallDuration(seconds),
    ordered.map((turn) => ({
      role: turn.role === 'user' ? ('user' as const) : ('ai' as const),
      text: turn.text ?? turn.content ?? '',
    })),
  );
  const first = ordered[0];
  return {
    ...first,
    _id: `voice-call-${sessionId}`,
    role: 'ai',
    text,
    is_voice: true,
    created_at: times.length ? new Date(Math.min(...times)).toISOString() : first.created_at,
  };
}
