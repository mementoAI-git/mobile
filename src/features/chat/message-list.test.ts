// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  createChatMessageIdFactory,
  getChatMessageItemType,
  getChatMessageKey,
} from './message-list';

describe('chat message list identity', () => {
  test('creates unique stable-format optimistic IDs within a session', () => {
    const createId = createChatMessageIdFactory('session');

    expect(createId()).toBe('chat-session-1');
    expect(createId()).toBe('chat-session-2');
  });

  test('prefers persisted identity and deterministically fingerprints legacy messages', () => {
    expect(getChatMessageKey({ _id: 'server-id', role: 'user', text: 'hello' })).toBe('server-id');

    const legacy = {
      role: 'ai',
      text: 'A remembered answer',
      created_at: '2026-07-20T12:00:00.000Z',
      replyTo: { role: 'user', text: 'Original question' },
      attatchments: [{ _id: 'file-id', url: 'https://example.com/file.jpg', name: 'file.jpg' }],
    };
    const key = getChatMessageKey(legacy);

    expect(key).toStartWith('legacy-');
    expect(getChatMessageKey({ ...legacy })).toBe(key);
  });

  test('separates recycler types by role and attachment layout', () => {
    expect(getChatMessageItemType({ role: 'user', text: 'one' })).toBe('user');
    expect(getChatMessageItemType({ role: 'user', text: '', attatchments: [{ url: 'a', name: 'a' }] })).toBe('user-attachments');
    expect(getChatMessageItemType({ role: 'ai', text: 'two' })).toBe('assistant');
    expect(getChatMessageItemType({ role: 'assistant', text: '', attatchments: [{ url: 'b', name: 'b' }] })).toBe('assistant-attachments');
    expect(getChatMessageItemType({ role: 'ai', text: 'Voice call completed (01:16)', is_voice: true })).toBe('voice-call');
  });

  test('assigns generated IDs to every optimistic message path', async () => {
    const source = await Bun.file(new URL('../../hooks/use-stream-chat.ts', import.meta.url)).text();

    expect(source).toContain('createChatMessageIdFactory');
    expect(source.match(/_id: createMessageId\(\)/g)).toHaveLength(4);
  });
});

describe('chat message recycling safety', () => {
  test('keeps attachment preview state outside recycled message bubbles', async () => {
    const bubble = await Bun.file(new URL('../../components/chat/MessageBubble.tsx', import.meta.url)).text();
    const screen = await Bun.file(new URL('../../screens/ChatScreen.tsx', import.meta.url)).text();

    expect(bubble).not.toContain('import { MediaPreviewModal');
    expect(bubble).not.toContain('<MediaPreviewModal');
    expect(bubble).not.toContain('previewVisible');
    expect(bubble).not.toContain('previewIndex');
    expect(bubble).toContain('onPreviewAttachments');
    expect(bubble).toContain('useEffect(() => setFailed(false), [url])');

    expect(screen).toContain("import { MediaPreviewModal");
    expect(screen.match(/<MediaPreviewModal/g)).toHaveLength(1);
    expect(screen).toContain('onPreviewAttachments={handlePreviewAttachments}');
  });
});

describe('chat FlashList migration', () => {
  test('uses the Expo-compatible FlashList v2 dependency and API', async () => {
    const packageJson = await Bun.file(new URL('../../../package.json', import.meta.url)).json();
    const screen = await Bun.file(new URL('../../screens/ChatScreen.tsx', import.meta.url)).text();
    const logic = await Bun.file(new URL('../../hooks/use-chat-logic.ts', import.meta.url)).text();

    expect(packageJson.dependencies['@shopify/flash-list']).toContain('2.0.2');
    expect(screen).toContain("import { FlashList } from '@shopify/flash-list';");
    expect(screen).toContain('<FlashList');
    expect(screen).toContain('keyExtractor={getChatMessageKey}');
    expect(screen).toContain('getItemType={getChatMessageItemType}');
    expect(screen).toContain('maintainVisibleContentPosition={isPromptType ? PROMPT_VISIBLE_CONTENT_POSITION : CHAT_VISIBLE_CONTENT_POSITION}');
    expect(screen).toContain('autoscrollToBottomThreshold');
    expect(screen).toContain('startRenderingFromBottom: true');
    expect(screen).toContain('startRenderingFromBottom: false');
    expect(screen).not.toMatch(/\n\s+inverted(?:\s|=)/);
    expect(screen).toContain('paddingBottom: messageBottomPadding');
    expect(screen).toContain('ListHeaderComponent={promptHeaderComponent}');
    expect(screen).toContain('ListFooterComponent={streamingFooterComponent}');
    expect(screen).not.toContain('onScrollToIndexFailed');

    expect(logic).toContain("import type { FlashListRef } from '@shopify/flash-list';");
    expect(logic).toContain('useRef<FlashListRef<ChatListMessage>>(null)');
    expect(logic).not.toContain('].reverse()');
  });
});
