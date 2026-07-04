import { useState, useCallback, useEffect, useRef } from 'react';
import { storageKeys } from '@/constants/storage-keys';
import { secureStorage } from '@/lib/secure-storage';
import endpoint from '@/api/endpoint';
import type { IAuth } from '@/types';
import type { ChatMode, LifeDimension } from '@/constants/enrichment';
import { buildPromptWithReplyQuote, type ChatReplyQuote } from '@/lib/utils';

interface StreamMessage {
  role: 'user' | 'ai';
  text: string;
  replyTo?: ChatReplyQuote;
}

interface SendOptions {
  replyTo?: ChatReplyQuote | null;
  chatMode?: ChatMode;
  deepDiveDimension?: LifeDimension | null;
  /** IDs of already-uploaded files to pass as context to the AI */
  attachments?: string[];
}

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export function useStreamChat(memoryId?: string) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const isMountedRef = useRef(true);
  // Keep a ref of streaming so `send` doesn't need it as a dep (which would
  // invalidate the callback on every stream start/stop and re-render everything downstream).
  const streamingRef = useRef(false);
  const memoryIdRef = useRef(memoryId);
  memoryIdRef.current = memoryId;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
      readerRef.current?.cancel().catch(() => undefined);
      readerRef.current = null;
    };
  }, []);

  const getToken = async (): Promise<string | null> => {
    try {
      const raw = await secureStorage.getItem(storageKeys.auth);
      return raw ? (JSON.parse(raw) as IAuth).access_token : null;
    } catch {
      return null;
    }
  };

  const send = useCallback(
    async (text: string, options?: SendOptions) => {
      if (!text.trim() || streamingRef.current) return;

      const { replyTo, chatMode, deepDiveDimension, attachments } = options ?? {};
      const apiPrompt = buildPromptWithReplyQuote(text, replyTo ?? null);

      const userMessage: StreamMessage = {
        role: 'user',
        text,
        ...(replyTo ? { replyTo } : {}),
      };
      setMessages((prev) => [...prev, userMessage]);
      streamingRef.current = true;
      setStreaming(true);
      setStreamingText('');

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = await getToken();
        if (!isMountedRef.current) return;

        const response = await fetch(`${baseURL}${endpoint.aiPrompt}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            // Field names must match web/src/pages/dashboard/chat/conversation/index.tsx
            text: apiPrompt,
            // Use ref so this always reads the latest memoryId without being a dep
            ...(memoryIdRef.current ? { memory: memoryIdRef.current } : {}),
            // Host Chat: send mode + dimension to the API (mirrors web)
            ...(chatMode ? { chatMode } : {}),
            ...(chatMode === 'deep_dive' && deepDiveDimension
              ? { deep_dive_dimension: deepDiveDimension }
              : {}),
            // File attachments uploaded before sending (parity with web ChatInput)
            ...(attachments && attachments.length > 0 ? { attachments } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done || !isMountedRef.current || controller.signal.aborted) break;
          const chunk = decoder.decode(value, { stream: true });
          // Handle full-text replacement pattern (web uses this)
          if (accumulated && chunk.length > accumulated.length && chunk.startsWith(accumulated)) {
            accumulated = chunk;
          } else {
            accumulated += chunk;
          }
          if (isMountedRef.current) setStreamingText(accumulated);
        }

        if (isMountedRef.current && !controller.signal.aborted) {
          setMessages((prev) => [...prev, { role: 'ai', text: accumulated }]);
          setStreamingText('');
        }
      } catch (err: any) {
        if (isMountedRef.current && err?.name !== 'AbortError') {
          setMessages((prev) => [
            ...prev,
            { role: 'ai', text: 'Sorry, something went wrong. Please try again.' },
          ]);
          setStreamingText('');
        }
      } finally {
        if (readerRef.current) {
          readerRef.current = null;
        }
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        if (isMountedRef.current) {
          streamingRef.current = false;
          setStreaming(false);
        }
      }
    },
    // No deps needed — all mutable values are read via refs (streamingRef, memoryIdRef,
    // isMountedRef, abortRef, readerRef). This keeps `send` a stable reference forever,
    // preventing re-renders of ChatInput / useChatLogic.send on every stream tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    readerRef.current?.cancel().catch(() => undefined);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setStreamingText('');
  }, []);

  return { messages, streaming, streamingText, send, abort, clear };
}
