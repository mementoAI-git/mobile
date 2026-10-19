import type { IMessageAttachment } from '@/types';
import { isVoiceCallMessage } from './voice-transcript-parser';

export interface ChatListMessage {
  _id?: string;
  role: string;
  text?: string;
  content?: string;
  created_at?: string;
  replyTo?: { role: string; text: string } | null;
  attatchments?: IMessageAttachment[];
  is_voice?: boolean;
  isLive?: boolean;
  /** Voice call this turn belongs to; turns of one call share it. */
  voice_session_id?: string | null;
  voice_turn_index?: number | null;
  voice_boundary?: 'started' | 'ended';
  /** Call length in seconds, saved on every turn when the call ends. */
  duration?: number | null;
}

let sessionCounter = 0;

export function createChatMessageIdFactory(sessionId?: string) {
  const stableSessionId = sessionId ?? `${Date.now().toString(36)}-${++sessionCounter}`;
  let messageCounter = 0;

  return () => `chat-${stableSessionId}-${++messageCounter}`;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getChatMessageKey(message: ChatListMessage) {
  if (message._id) return message._id;

  const legacyIdentity = JSON.stringify({
    role: message.role,
    createdAt: message.created_at ?? '',
    text: message.text ?? message.content ?? '',
    reply: message.replyTo ?? null,
    attachments: (message.attatchments ?? []).map((attachment) => ({
      id: attachment._id ?? '',
      url: attachment.url,
      name: attachment.name,
      type: attachment.type ?? '',
    })),
  });

  return `legacy-${stableHash(legacyIdentity)}`;
}

export function getChatMessageItemType(message: ChatListMessage) {
  if (message.voice_boundary) return 'voice-divider';
  if (isVoiceCallMessage(message.text ?? message.content, message.is_voice)) {
    return 'voice-call';
  }
  const role = message.role === 'user' ? 'user' : 'assistant';
  return message.attatchments?.length ? `${role}-attachments` : role;
}
