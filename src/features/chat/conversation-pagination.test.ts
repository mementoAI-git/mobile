// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('conversation cursor pagination', () => {
  test('follows the next cursor and merges older pages chronologically without duplicates', async () => {
    let pagination: typeof import('./conversation-pagination') | undefined;
    try {
      pagination = await import('./conversation-pagination');
    } catch {
      // Expected on the first red run.
    }

    expect(pagination?.getNextConversationCursor).toBeFunction();
    expect(pagination?.getConversationMessagesUrl).toBeFunction();
    expect(pagination!.getConversationMessagesUrl('/ai/prompt/messages', 'thread-1')).toBe(
      '/ai/prompt/messages/thread-1',
    );
    expect(pagination!.getConversationMessagesUrl('/ai/prompt/messages', 'thread-1', 'older+page/2')).toBe(
      '/ai/prompt/messages/thread-1?next=older%2Bpage%2F2',
    );

    const latestPage = {
      messages: [
        { _id: 'm3', role: 'assistant', text: 'three' },
        { _id: 'm4', role: 'user', text: 'four' },
      ],
      next: 'older-cursor',
    };
    const olderPage = {
      messages: [
        { _id: 'm1', role: 'user', text: 'one' },
        { _id: 'm2', role: 'assistant', text: 'two' },
        { _id: 'm3', role: 'assistant', text: 'three' },
      ],
      next: null,
    };

    expect(pagination!.getNextConversationCursor(latestPage)).toBe('older-cursor');
    expect(pagination!.getNextConversationCursor(olderPage)).toBeUndefined();
    expect(pagination!.mergeConversationMessagePages([latestPage, olderPage]).map((message) => message._id)).toEqual([
      'm1',
      'm2',
      'm3',
      'm4',
    ]);
  });

  test('deduplicates live optimistic messages with newly fetched server messages', async () => {
    const pagination = await import('./conversation-pagination');

    const persisted = [
      { _id: 'srv-1', role: 'user', text: "What's the moral?" },
      { _id: 'srv-2', role: 'ai', text: "That's a sharp question, Saviour." },
    ];
    const live = [
      { _id: 'chat-opt-1', role: 'user', text: "What's the moral?" },
      { _id: 'chat-opt-2', role: 'ai', text: "That's a sharp question, Saviour." },
    ];

    const merged = pagination.mergeAllConversationMessages(persisted, live);
    expect(merged).toHaveLength(2);
    expect(merged[0]._id).toBe('srv-1');
    expect(merged[1]._id).toBe('srv-2');
  });
});
