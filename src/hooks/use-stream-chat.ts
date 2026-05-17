import { useState, useCallback, useRef } from 'react';
import { storageKeys } from '@/constants/storage-keys';
import { secureStorage } from '@/lib/secure-storage';
import endpoint from '@/api/endpoint';
import type { IAuth } from '@/types';

interface StreamMessage {
  role: 'user' | 'ai';
  text: string;
}

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export function useStreamChat(memoryId?: string) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const getToken = async (): Promise<string | null> => {
    try {
      const raw = await secureStorage.getItem(storageKeys.auth);
      return raw ? (JSON.parse(raw) as IAuth).access_token : null;
    } catch {
      return null;
    }
  };

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMessage: StreamMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setStreaming(true);
    setStreamingText('');

    abortRef.current = new AbortController();

    try {
      const token = await getToken();
      const response = await fetch(`${baseURL}${endpoint.aiPrompt}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: text,
          ...(memoryId ? { memory_id: memoryId } : {}),
        }),
        signal: abortRef.current.signal,
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamingText(accumulated);
      }

      setMessages((prev) => [...prev, { role: 'ai', text: accumulated }]);
      setStreamingText('');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          { role: 'ai', text: 'Sorry, something went wrong. Please try again.' },
        ]);
      }
      setStreamingText('');
    } finally {
      setStreaming(false);
    }
  }, [streaming, memoryId]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setStreamingText('');
  }, []);

  return { messages, streaming, streamingText, send, abort, clear };
}
