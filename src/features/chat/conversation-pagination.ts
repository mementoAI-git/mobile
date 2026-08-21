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
