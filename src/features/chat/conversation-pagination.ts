import {
  getChatMessageKey,
  type ChatListMessage,
} from '@/features/chat/message-list';

export interface ConversationMessagePage {
  messages: ChatListMessage[];
  next?: string | null;
  title?: string;
}

export function getNextConversationCursor(lastPage: ConversationMessagePage) {
  return lastPage.next || undefined;
}

export function getConversationMessagesUrl(
  basePath: string,
  conversationId: string,
  cursor?: string,
) {
  const url = `${basePath}/${conversationId}`;
  return cursor ? `${url}?next=${encodeURIComponent(cursor)}` : url;
}

export function mergeConversationMessagePages(pages: ConversationMessagePage[]) {
  const seen = new Set<string>();
  const messages: ChatListMessage[] = [];

  for (const page of [...pages].reverse()) {
    for (const message of page.messages ?? []) {
      const key = getChatMessageKey(message);
      if (seen.has(key)) continue;
      seen.add(key);
      messages.push(message);
    }
  }

  return messages;
}

export function isSameChatRole(roleA?: string, roleB?: string): boolean {
  if (roleA === roleB) return true;
  const isAssistantA = roleA === 'assistant' || roleA === 'ai';
  const isAssistantB = roleB === 'assistant' || roleB === 'ai';
  return Boolean(isAssistantA && isAssistantB);
}

export function mergeAllConversationMessages(
  persistedMessages: ChatListMessage[],
  liveMessages: ChatListMessage[],
): ChatListMessage[] {
  if (liveMessages.length === 0) return persistedMessages;
  if (persistedMessages.length === 0) return liveMessages;

  const result = [...persistedMessages];

  for (const live of liveMessages) {
    const alreadyPersisted = persistedMessages.some((p) => {
      if (p._id && live._id && p._id === live._id) return true;
      const pText = (p.text ?? p.content ?? '').trim();
      const liveText = (live.text ?? live.content ?? '').trim();
      if (isSameChatRole(p.role, live.role) && pText && liveText && pText === liveText) {
        return true;
      }
      return false;
    });

    if (!alreadyPersisted) {
      result.push(live);
    }
  }

  return result;
}

