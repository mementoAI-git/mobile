import { currentDigitalMindHeaders } from '@/features/chat/digital-mind-runtime';
import { useReducedMotion } from 'react-native-reanimated';
import { createTextReveal } from '@/features/chat/text-reveal';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import endpoint from '@/api/endpoint';
import { useAuthStore } from '@/store';
import { API_BASE_URL } from '@/lib/env';
import { getMementoClientHeaders } from '@/api/client-runtime-metadata';
import type { ChatMode, LifeDimension } from '@/constants/enrichment';
import { buildPromptWithReplyQuote, type ChatReplyQuote } from '@/lib/utils';
import type { IMessageAttachment } from '@/types';
import { createChatMessageIdFactory } from '@/features/chat/message-list';
import { runtimeDiagnostics } from '@/lib/runtime-diagnostics';

type ChatAttachmentPreview = IMessageAttachment;

interface StreamMessage {
  _id: string;
  role: 'user' | 'ai';
  text: string;
  created_at?: string;
  replyTo?: ChatReplyQuote;
  attatchments?: ChatAttachmentPreview[];
  isLive?: boolean;
}

interface SendOptions {
  replyTo?: ChatReplyQuote | null;
  chatMode?: ChatMode;
  deepDiveDimension?: LifeDimension | null;
  /** IDs of already-uploaded files to pass as context to the AI */
  attachments?: string[];
  /** Uploaded file metadata used for the optimistic chat bubble preview */
  attachmentPreviews?: ChatAttachmentPreview[];
  /** Dynamic memory ID override */
  memoryId?: string;
}

export function useStreamChat(memoryId?: string, promptId?: string) {
  const reducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const revealRef = useRef<ReturnType<typeof createTextReveal> | null>(null);
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
  const promptIdRef = useRef(promptId);
  promptIdRef.current = promptId;
  const lastMemoryIdRef = useRef(memoryId);
  const createMessageIdRef = useRef<ReturnType<typeof createChatMessageIdFactory> | null>(null);
  if (!createMessageIdRef.current) {
    createMessageIdRef.current = createChatMessageIdFactory();
  }
  const createMessageId = createMessageIdRef.current;

  useEffect(() => {
    // Fast Refresh and effect replay run cleanup without recreating refs.
    isMountedRef.current = true;
    // Cleanup aborted the old request; replay must also release its UI guard.
    streamingRef.current = false;
    setStreaming(false);
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
      readerRef.current?.cancel().catch(() => undefined);
      readerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const previousMemoryId = lastMemoryIdRef.current;
    lastMemoryIdRef.current = memoryId;
    // Only reset if transitioning between two distinct established conversations
    if (!previousMemoryId || !memoryId || previousMemoryId === memoryId) {
      return;
    }
    abortRef.current?.abort();
    readerRef.current?.cancel().catch(() => undefined);
    readerRef.current = null;
    streamingRef.current = false;
    setMessages([]);
    setStreamingText('');
    setStreaming(false);
  }, [memoryId]);

  const send = useCallback(
    async (text: string, options?: SendOptions) => {
      const { replyTo, chatMode, deepDiveDimension, attachments, attachmentPreviews, memoryId: explicitMemoryId } = options ?? {};
      const targetMemoryId = explicitMemoryId || memoryIdRef.current;
      if (explicitMemoryId) {
        memoryIdRef.current = explicitMemoryId;
      }
      // Block if both text and attachments are empty, or if already streaming
      const hasText = text.trim().length > 0;
      const hasAttachments = (attachments ?? []).length > 0;
      if ((!hasText && !hasAttachments) || streamingRef.current) return;

      const apiPrompt = buildPromptWithReplyQuote(text, replyTo ?? null);

      const userMessage: StreamMessage = {
        _id: createMessageId(),
        role: 'user',
        text: hasText ? text : '',
        created_at: new Date().toISOString(),
        isLive: true,
        ...(replyTo ? { replyTo } : {}),
        ...(attachmentPreviews?.length ? { attatchments: attachmentPreviews } : {}),
      };
      setMessages((prev) => [...prev, userMessage]);
      streamingRef.current = true;
      setStreaming(true);
      setStreamingText('');
      const finishStream = runtimeDiagnostics.start('chat', 'stream-session', {
        hasAttachments,
        mode: chatMode ?? 'open',
      });
      let streamOutcome: 'success' | 'abort' | 'failure' = 'failure';
      const streamStartedAt = Date.now();
      let firstChunkMs: number | null = null;
      let streamChunkCount = 0;
      let streamErrorClass: string | undefined;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const reveal = createTextReveal({
        immediate: () => reducedMotionRef.current,
        onText: (visible) => {
          if (isMountedRef.current && abortRef.current === controller && !controller.signal.aborted) setStreamingText(visible);
        },
      });
      revealRef.current = reveal;
      const cancelReveal = () => reveal.cancel();
      controller.signal.addEventListener('abort', cancelReveal, { once: true });

      try {
        // Read from in-memory Zustand store — synchronous, zero native I/O latency.
        // secureStorage.getItem (expo-secure-store) requires hardware crypto per call: ~50–300ms.
        // The token was already fetched once at app startup and hydrated into useAuthStore.
        const token = useAuthStore.getState().token?.access_token ?? null;
        if (!isMountedRef.current) return;

        const response = await fetch(`${API_BASE_URL}${endpoint.aiPrompt}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getMementoClientHeaders(),
            ...currentDigitalMindHeaders(),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            // Send text only if non-empty — media-only messages omit the text field entirely
            ...(apiPrompt ? { text: apiPrompt } : {}),
            // Use ref so this always reads the latest memoryId without being a dep
            ...(targetMemoryId ? { memory: targetMemoryId } : {}),
            // If no memoryId yet, send prompt_id to associate this conversation with the prompt
            ...(!targetMemoryId && promptIdRef.current && promptIdRef.current !== 'new'
              ? { prompt_id: promptIdRef.current, prompt: promptIdRef.current }
              : {}),
            // Reply quote — stored as a separate field on the message document
            ...(replyTo ? { replyTo } : {}),
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

        if (!response.ok) {
          throw new Error(`Prompt stream failed (${response.status})`);
        }
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done || !isMountedRef.current || controller.signal.aborted) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk.length && firstChunkMs === null) firstChunkMs = Date.now() - streamStartedAt;
          streamChunkCount += 1;
          runtimeDiagnostics.rate('chat', 'stream-chunks');
          // Handle full-text replacement pattern (web uses this)
          if (accumulated && chunk.length > accumulated.length && chunk.startsWith(accumulated)) {
            accumulated = chunk;
          } else {
            accumulated += chunk;
          }
          reveal.update(accumulated);
        }

        // Keep the pending message and Stop control alive until the visible text catches up.
        await reveal.finish();
        if (isMountedRef.current && !controller.signal.aborted && abortRef.current === controller) {
          streamOutcome = 'success';
          streamingRef.current = false;
          setMessages((prev) => [...prev, {
            _id: createMessageId(),
            role: 'ai',
            text: accumulated,
            created_at: new Date().toISOString(),
            isLive: true,
          }]);
          setStreamingText('');
          setStreaming(false);
        }
      } catch (err: any) {
        streamOutcome = err?.name === 'AbortError' ? 'abort' : 'failure';
        streamErrorClass = err instanceof Error ? err.name : 'UnknownError';
        if (isMountedRef.current && err?.name !== 'AbortError') {
          streamingRef.current = false;
          setMessages((prev) => [
            ...prev,
            {
              _id: createMessageId(),
              role: 'ai',
              text: 'We lost connection for a moment. Please check your network and try again.',
              created_at: new Date().toISOString(),
            },
          ]);
          setStreamingText('');
          setStreaming(false);
        }
      } finally {
        controller.signal.removeEventListener('abort', cancelReveal);
        reveal.cancel();
        if (revealRef.current === reveal) revealRef.current = null;
        finishStream({
          outcome: controller.signal.aborted ? 'abort' : streamOutcome,
          chunkCount: streamChunkCount,
          firstChunkMs,
          ...(streamErrorClass ? { errorClass: streamErrorClass } : {}),
        });
        if (abortRef.current === controller) {
          readerRef.current = null;
          abortRef.current = null;
          if (isMountedRef.current) {
            streamingRef.current = false;
            setStreaming(false);
          }
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
    const partial = revealRef.current?.text;
    revealRef.current?.cancel();
    revealRef.current = null;
    abortRef.current?.abort();
    readerRef.current?.cancel().catch(() => undefined);
    readerRef.current = null;
    streamingRef.current = false;
    if (partial && isMountedRef.current) {
      setMessages(prev => [...prev, { _id: createMessageId(), role: 'ai', text: partial, created_at: new Date().toISOString(), isLive: true }]);
    }
    setStreamingText('');
    setStreaming(false);
  }, [createMessageId]);

  const clear = useCallback(() => {
    setMessages([]);
    setStreamingText('');
  }, []);

  return useMemo(
    () => ({ messages, streaming, streamingText, send, abort, clear }),
    [messages, streaming, streamingText, send, abort, clear],
  );
}
