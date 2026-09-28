import { GoogleGenAI } from '@google/genai/web';
import type { LiveServerMessage, Session } from '@google/genai/web';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import endpoint from '@/api/endpoint';
import { get, post } from '@/api/mutations';
import { VoiceAudioEngine } from '@/features/chat/voice-audio-engine';
import {
  getVoiceConnectionFailure,
  type VoiceConnectionFailure,
} from '@/features/chat/voice-entitlement';
import {
  buildGeminiLiveConfig,
  parseVoiceLiveToken,
} from '@/features/chat/voice-live-config';
import { VoiceMessageHandler } from '@/features/chat/voice-message-handler';
import {
  VoiceTranscriptTurns,
  type VoiceTranscriptTurn,
} from '@/features/chat/voice-transcript-turns';
import { isPermissionGranted } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { logger } from '@/lib/logger';

type SetupReady = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
};

function createSetupReady(): SetupReady {
  let settled = false;
  let resolvePromise!: () => void;
  let rejectPromise!: (error: Error) => void;
  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  void promise.catch(() => undefined);

  return {
    promise,
    resolve: () => {
      if (settled) return;
      settled = true;
      resolvePromise();
    },
    reject: (error) => {
      if (settled) return;
      settled = true;
      rejectPromise(error);
    },
  };
}

function restoreTurns(accumulator: VoiceTranscriptTurns, turns: VoiceTranscriptTurn[]): void {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    accumulator.restoreFailedTurn(turns[index]);
  }
}

export function useVoiceMode({
  memoryId,
  voiceName,
}: { memoryId?: string | null; voiceName?: string } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [aiSpeechText, setAiSpeechText] = useState('Ready to connect secure voice link...');
  const [userSpeechText, setUserSpeechText] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [connectionFailure, setConnectionFailure] = useState<VoiceConnectionFailure | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const engineRef = useRef<VoiceAudioEngine | null>(null);
  const messageHandlerRef = useRef(new VoiceMessageHandler());
  const setupReadyRef = useRef<SetupReady | null>(null);
  const isMutedRef = useRef(false);
  const isMountedRef = useRef(true);
  const isDisconnectingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const transcriptRef = useRef(new VoiceTranscriptTurns());
  const transcriptFlushRef = useRef(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const memoryIdRef = useRef(memoryId);
  memoryIdRef.current = memoryId;

  const flushTranscripts = useCallback(() => {
    const persist = async () => {
      const turns = transcriptRef.current.drainCompleted();
      if (!turns.length) return;
      const targetMemoryId = memoryIdRef.current;
      if (!targetMemoryId) {
        restoreTurns(transcriptRef.current, turns);
        return;
      }

      try {
        await post(endpoint.addMessageToMemory, {
          memory_id: targetMemoryId,
          session_id: sessionIdRef.current,
          messages: turns.flatMap((turn) => turn.messages),
        });
      } catch (error) {
        logger.error('Failed to save voice transcript', error);
        restoreTurns(transcriptRef.current, turns);
      }
    };
    transcriptFlushRef.current = transcriptFlushRef.current.then(persist, persist);
    return transcriptFlushRef.current;
  }, []);

  useEffect(() => {
    if (memoryId) void flushTranscripts();
  }, [memoryId, flushTranscripts]);

  const handleLiveMessage = useCallback(
    (message: LiveServerMessage) => {
      const engine = engineRef.current;
      for (const effect of messageHandlerRef.current.handle(message)) {
        if (effect.type === 'setup-complete') {
          engine?.markSetupComplete();
          setupReadyRef.current?.resolve();
        } else if (effect.type === 'interrupted') {
          engine?.interruptOutput(effect.epoch);
          transcriptRef.current.completeTurn();
          void flushTranscripts();
          if (isMountedRef.current) setIsAiSpeaking(false);
        } else if (effect.type === 'output-audio') {
          if (engine?.enqueueOutput(effect.data, effect.epoch) && isMountedRef.current) {
            setIsAiSpeaking(true);
          }
        } else if (effect.type === 'input-transcript') {
          const text = transcriptRef.current.appendUser(effect.text);
          if (isMountedRef.current) setUserSpeechText(text);
        } else if (effect.type === 'output-transcript') {
          const text = transcriptRef.current.appendModel(effect.text);
          if (isMountedRef.current) setAiSpeechText(text);
        } else if (effect.type === 'turn-complete') {
          engine?.finishOutputTurn();
          transcriptRef.current.completeTurn();
          void flushTranscripts();
        }
      }
    },
    [flushTranscripts],
  );

  const disconnect = useCallback(async () => {
    if (isDisconnectingRef.current) return;
    isDisconnectingRef.current = true;
    isMutedRef.current = true;
    setupReadyRef.current?.reject(new Error('Voice session closed before setup completed.'));
    setupReadyRef.current = null;

    const engine = engineRef.current;
    engineRef.current = null;
    await engine?.stop().catch((error) => logger.warn('Voice audio cleanup failed', error));
    if (engine) logger.runtime('[VoiceMode] session metrics', engine.snapshot());

    const session = sessionRef.current;
    sessionRef.current = null;
    session?.close();
    transcriptRef.current.completeTurn();
    await flushTranscripts();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (isMountedRef.current) {
      setIsConnected(false);
      setIsConnecting(false);
      setIsAiSpeaking(false);
    }
    isDisconnectingRef.current = false;
  }, [flushTranscripts]);

  const disconnectRef = useRef(disconnect);
  disconnectRef.current = disconnect;

  const connect = useCallback(async () => {
    if (isConnecting || isConnected || isDisconnectingRef.current) return;
    setIsConnecting(true);
    isMutedRef.current = false;
    setIsMuted(false);
    setRecordingTime(0);
    setAiSpeechText('Connecting secure voice link...');
    setUserSpeechText('');
    setConnectionFailure(null);
    transcriptRef.current = new VoiceTranscriptTurns();
    sessionIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    messageHandlerRef.current = new VoiceMessageHandler();
    const setupReady = createSetupReady();
    setupReadyRef.current = setupReady;

    const engine = new VoiceAudioEngine({
      onFatalError: (error) => {
        logger.error('Native voice audio failed', error);
        if (isMountedRef.current) {
          setConnectionFailure({
            kind: 'connection-error',
            message: 'Voice audio was interrupted. Tap to reconnect.',
          });
        }
        void disconnectRef.current();
      },
      onPlaybackStateChange: (state) => {
        if (!isMountedRef.current) return;
        if (state === 'playing') setIsAiSpeaking(true);
        if (state === 'idle' || state === 'stopped') setIsAiSpeaking(false);
      },
    });
    engineRef.current = engine;

    try {
      const permission = await engine.requestRecordingPermission();
      if (!isPermissionGranted(permission)) {
        engineRef.current = null;
        setIsConnecting(false);
        showPermissionRecoveryAlert({
          permission,
          title: 'Microphone access needed',
          description: 'Memento needs microphone access to start voice mode.',
          settingsDescription: 'Enable microphone permissions in Settings to talk with Memento.',
        });
        return;
      }

      const tokenResponse = await get<unknown>(endpoint.ephemeralToken);
      const liveToken = parseVoiceLiveToken(tokenResponse.data, voiceName ?? 'Fenrir');
      const client = new GoogleGenAI({
        apiKey: liveToken.token,
        httpOptions: { apiVersion: 'v1alpha' },
      });
      sessionRef.current = await client.live.connect({
        model: liveToken.model,
        callbacks: {
          onopen: () => engine.markConnectionOpen(),
          onmessage: handleLiveMessage,
          onerror: (error) => {
            logger.error('Live voice session failed', error);
            setupReady.reject(new Error('Voice session failed during setup.'));
            if (isMountedRef.current) {
              setConnectionFailure({
                kind: 'connection-error',
                message: 'Voice session was disconnected. Tap to reconnect.',
              });
            }
            void disconnectRef.current();
          },
          onclose: () => {
            setupReady.reject(new Error('Voice session closed during setup.'));
            void disconnectRef.current();
          },
        },
        config: buildGeminiLiveConfig(liveToken.voiceName),
      });

      await engine.start((data) => {
        if (isMutedRef.current) return;
        sessionRef.current?.sendRealtimeInput({
          audio: { data, mimeType: 'audio/pcm;rate=16000' },
        });
      });
      await setupReady.promise;
      sessionRef.current.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: 'Start with a brief, warm greeting. Then invite me to share what is on my mind.',
              },
            ],
          },
        ],
        turnComplete: true,
      });
      timerRef.current = setInterval(() => setRecordingTime((time) => time + 1), 1_000);
      if (isMountedRef.current) {
        setIsConnected(true);
        setIsConnecting(false);
      }
    } catch (error) {
      const failure = getVoiceConnectionFailure(error);
      if (failure.kind === 'connection-error') {
        logger.error('Failed to connect voice session', error);
      }
      if (isMountedRef.current) setConnectionFailure(failure);
      await disconnect();
    }
  }, [disconnect, handleLiveMessage, isConnected, isConnecting, voiceName]);

  const toggleMute = useCallback(() => {
    void Haptics.selectionAsync();
    isMutedRef.current = !isMutedRef.current;
    setIsMuted(isMutedRef.current);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      void disconnectRef.current();
    };
  }, []);

  return useMemo(
    () => ({
      isConnected,
      isConnecting,
      isMuted,
      recordingTime,
      aiSpeechText,
      userSpeechText,
      isAiSpeaking,
      connectionFailure,
      connect,
      disconnect,
      toggleMute,
    }),
    [
      isConnected,
      isConnecting,
      isMuted,
      recordingTime,
      aiSpeechText,
      userSpeechText,
      isAiSpeaking,
      connectionFailure,
      connect,
      disconnect,
      toggleMute,
    ],
  );
}
