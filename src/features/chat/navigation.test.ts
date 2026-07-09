// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import * as navigation from './navigation';

describe('chat navigation', () => {
  test('resolves the host conversation inside the chat tab without redirecting', () => {
    expect(typeof navigation.resolveChatConversationId).toBe('function');
    if (typeof navigation.resolveChatConversationId !== 'function') return;

    expect(navigation.resolveChatConversationId(undefined, 'conversation-123')).toBe('conversation-123');
    expect(navigation.resolveChatConversationId('conversation-456', 'conversation-123')).toBe('conversation-456');
    expect(navigation.resolveChatConversationId('new', 'conversation-123')).toBeNull();
  });

  test('keeps the chat tab and final chat screen on one navigation path', async () => {
    const tabBarSource = await Bun.file(
      new URL('../../components/TabBar.tsx', import.meta.url),
    ).text();
    const chatTabSource = await Bun.file(
      new URL('../../../app/(tabs)/chat/index.tsx', import.meta.url),
    ).text();

    expect(tabBarSource).not.toContain('router.push(getPrimaryChatHref');
    expect(tabBarSource).toContain("pathname === '/chat'");
    expect(chatTabSource).not.toContain('router.replace');
    expect(chatTabSource).toContain("from '@/screens/ChatScreen'");
  });
});
