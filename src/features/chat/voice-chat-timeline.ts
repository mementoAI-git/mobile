import { getChatMessageKey, type ChatListMessage } from './message-list';
import { isVoiceCallMessage, parseVoiceCallMessage } from './voice-transcript-parser';

export interface VoiceChatSession {
  id: string;
  memoryId?: string;
  startedAt: string;
  endedAt?: string;
  messages: ChatListMessage[];
}

type TimelineMessage = ChatListMessage & { voicePlaceholder?: boolean };
const sessionKey = (message: ChatListMessage) => message.is_voice ? message.voice_session_id : null;
const turnKey = (message: ChatListMessage) => message.voice_session_id && message.voice_turn_index != null
  ? `${message.voice_session_id}:${message.voice_turn_index}` : getChatMessageKey(message);

/** Keep the same inline transcript and start/end boundaries as web chat. */
export function buildVoiceChatTimeline(messages: ChatListMessage[], live?: VoiceChatSession | null): ChatListMessage[] {
  const savedSessions = new Set(messages.filter(message => sessionKey(message) && !isVoiceCallMessage(message.text ?? message.content, message.is_voice)).map(sessionKey));
  const normalized: TimelineMessage[] = messages.flatMap(message => {
    const text = message.text ?? message.content ?? '';
    if (!isVoiceCallMessage(text, message.is_voice)) return [message];
    const id = message.voice_session_id || `legacy-${getChatMessageKey(message)}`;
    if (savedSessions.has(id)) return [];
    const parsed = parseVoiceCallMessage(text);
    const turns = parsed.turns.map((turn, index) => ({
      ...message, _id: `${id}:turn:${index}`, role: turn.speaker === 'user' ? 'user' : 'ai', text: turn.text,
      is_voice: true, voice_session_id: id, voice_turn_index: index,
    }));
    return turns.length ? turns : [{ ...message, voice_session_id: id, is_voice: true, voicePlaceholder: true }];
  });
  if (live) {
    const savedKeys = new Set(normalized.map(turnKey));
    for (const message of live.messages) {
      if (!savedKeys.has(turnKey(message))) normalized.push(message);
    }
    if (!normalized.some(message => sessionKey(message) === live.id)) {
      normalized.push({ _id: `${live.id}:empty`, role: 'system', created_at: live.startedAt, is_voice: true, voice_session_id: live.id, voicePlaceholder: true });
    }
  }
  normalized.sort((a, b) => {
    if (sessionKey(a) && sessionKey(a) === sessionKey(b) && a.voice_turn_index != null && b.voice_turn_index != null) {
      return a.voice_turn_index - b.voice_turn_index;
    }
    return (Date.parse(a.created_at ?? '') || 0) - (Date.parse(b.created_at ?? '') || 0);
  });
  const bounds = new Map<string, { first: number; last: number }>();
  normalized.forEach((message, index) => {
    const id = sessionKey(message);
    if (!id) return;
    const previous = bounds.get(id);
    bounds.set(id, { first: previous?.first ?? index, last: index });
  });
  const rows: ChatListMessage[] = [];
  normalized.forEach((message, index) => {
    const id = sessionKey(message);
    const bound = id ? bounds.get(id) : null;
    const boundary = (kind: 'started' | 'ended'): ChatListMessage => ({
      _id: `voice-${id}-${kind}`, role: 'system',
      text: kind === 'started' ? 'Voice conversation started' : 'Voice conversation ended',
      voice_boundary: kind, voice_session_id: id,
      created_at: live && live.id === id ? (kind === 'started' ? live.startedAt : live.endedAt) : message.created_at,
    });
    if (bound?.first === index) rows.push(boundary('started'));
    if (!message.voicePlaceholder) rows.push(message);
    if (bound?.last === index && (live?.id !== id || live?.endedAt)) rows.push(boundary('ended'));
  });
  return rows;
}
