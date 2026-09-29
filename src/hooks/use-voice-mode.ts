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
  type VoiceTranscriptMessage,
} from '@/features/chat/voice-transcript-turns';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { serializeVoiceCallTranscript } from '@/features/chat/voice-transcript-parser';
import { getConversationMessagesUrl } from '@/features/chat/conversation-pagination';
import { isPermissionGranted } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { logger } from '@/lib/logger';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore, useUserStore } from '@/store';

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
  const isGreetingActiveRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const isMountedRef = useRef(true);
  const isDisconnectingRef = useRef(false);
  const isSessionActiveRef = useRef(false);
  const hasCompletedSessionRef = useRef(false);
  const sessionIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const transcriptRef = useRef(new VoiceTranscriptTurns());
  const transcriptFlushRef = useRef(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimeRef = useRef(0);
  const userSpeechTextRef = useRef('');
  const aiSpeechTextRef = useRef('');
  const memoryIdRef = useRef(memoryId);
  if (memoryId && /^[0-9a-fA-F]{24}$/.test(memoryId)) {
    memoryIdRef.current = memoryId;
  }

  const flushTranscripts = useCallback(() => {
    const persist = async () => {
      const turns = transcriptRef.current.drainCompleted();
      if (!turns.length) return;

      const cachedProfile = queryClient.getQueryData<any>(queryKeys.profile);
      const userPrimaryId =
        useUserStore.getState().user?.primary_conversation_id ??
        useAuthStore.getState().user?.primary_conversation_id ??
        cachedProfile?.primary_conversation_id;
      const rawTargetId = memoryIdRef.current || userPrimaryId;
      const targetMemoryId =
        rawTargetId && /^[0-9a-fA-F]{24}$/.test(rawTargetId) ? rawTargetId : undefined;

      const payload: {
        session_id: string;
        messages: VoiceTranscriptMessage[];
        memory_id?: string;
      } = {
        session_id: sessionIdRef.current,
        messages: turns.flatMap((turn) => turn.messages),
      };
      if (targetMemoryId) {
        payload.memory_id = targetMemoryId;
      }

      try {
        const res = await post(endpoint.addMessageToMemory, payload);
        const data = (res as any)?.data;
        const createdList = Array.isArray(data) ? data : (Array.isArray(res) ? res : []);
        const createdMemoryId =
          createdList[0]?.memory || (data as any)?.memory || targetMemoryId;

        if (createdMemoryId) {
          memoryIdRef.current = createdMemoryId;
          const currentUser = useUserStore.getState().user;
          if (currentUser && !currentUser.primary_conversation_id) {
            useUserStore.getState().setUser({
              ...currentUser,
              primary_conversation_id: createdMemoryId,
            });
          }

          void queryClient.invalidateQueries({
            queryKey: queryKeys.promptMessages(createdMemoryId),
          });
          void queryClient.invalidateQueries({
            queryKey: queryKeys.memory(createdMemoryId),
          });
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.memories() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.stories() });
      } catch (error) {
        logger.error('Failed to save voice transcript', error);
        restoreTurns(transcriptRef.current, turns);
      }
    };
    transcriptFlushRef.current = transcriptFlushRef.current.then(persist, persist);
    return transcriptFlushRef.current;
  }, []);

  useEffect(() => {
    if (memoryId && /^[0-9a-fA-F]{24}$/.test(memoryId)) {
      memoryIdRef.current = memoryId;
      void flushTranscripts();
    }
  }, [memoryId, flushTranscripts]);

  const handleLiveMessage = useCallback(
    (message: LiveServerMessage) => {
      const engine = engineRef.current;
      const currentEpoch = engine?.getEpoch() ?? 1;
      for (const effect of messageHandlerRef.current.handle(message, currentEpoch)) {
        if (effect.type === 'setup-complete') {
          engine?.markSetupComplete();
          setupReadyRef.current?.resolve();
        } else if (effect.type === 'interrupted') {
          // Server confirmed interruption — engine owns the new epoch
          const newEpoch = engine?.nextEpoch() ?? 1;
          engine?.interruptOutput(newEpoch);
          isGreetingActiveRef.current = false;
          isAiSpeakingRef.current = false;
          transcriptRef.current.completeTurn();
          void flushTranscripts();
          if (isMountedRef.current) setIsAiSpeaking(false);
        } else if (effect.type === 'output-audio') {
          if (engine?.enqueueOutput(effect.data, effect.epoch) && isMountedRef.current) {
            isAiSpeakingRef.current = true;
            setIsAiSpeaking(true);
          }
        } else if (effect.type === 'input-transcript') {
          const text = transcriptRef.current.appendUser(effect.text);
          userSpeechTextRef.current = text;
          if (isMountedRef.current) setUserSpeechText(text);
        } else if (effect.type === 'output-transcript') {
          const text = transcriptRef.current.appendModel(effect.text);
          aiSpeechTextRef.current = text;
          if (isMountedRef.current) setAiSpeechText(text);
        } else if (effect.type === 'turn-complete') {
          // Signal the playback controller that no more buffers are coming for this turn.
          // Do NOT disarm isGreetingActiveRef here — playback may still be draining.
          // onPlaybackStateChange→idle is the sole authority for disarming the greeting shield.
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
    if (hasCompletedSessionRef.current || !isSessionActiveRef.current) return;
    isDisconnectingRef.current = true;
    hasCompletedSessionRef.current = true;
    isSessionActiveRef.current = false;
    isMutedRef.current = true;
    isGreetingActiveRef.current = false;
    setupReadyRef.current?.reject(new Error('Voice session closed before setup completed.'));
    setupReadyRef.current = null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const finalDuration = recordingTimeRef.current;
    recordingTimeRef.current = 0;

    const engine = engineRef.current;
    engineRef.current = null;
    await engine?.stop().catch((error) => logger.warn('Voice audio cleanup failed', error));
    if (engine) logger.runtime('[VoiceMode] session metrics', engine.snapshot());

    const session = sessionRef.current;
    sessionRef.current = null;
    session?.close();
    transcriptRef.current.completeTurn();

    const formattedDuration = formatVoiceCallDuration(finalDuration);
    const sessionTurns = transcriptRef.current.getSessionTurns();

    if (sessionTurns.length > 0) {
      const flattened = sessionTurns.flatMap((turn) => turn.messages);
      const callRecordText = serializeVoiceCallTranscript(formattedDuration, flattened);
      transcriptRef.current.appendModel(callRecordText);
      transcriptRef.current.completeTurn();
    } else if (finalDuration >= 3) {
      const userText = userSpeechTextRef.current.trim();
      const aiText =
        aiSpeechTextRef.current.trim() &&
        !aiSpeechTextRef.current.includes('Ready to connect') &&
        !aiSpeechTextRef.current.includes('Connecting')
          ? aiSpeechTextRef.current.trim()
          : `Voice call completed (${formattedDuration})`;

      if (userText) {
        transcriptRef.current.appendUser(userText);
      }
      transcriptRef.current.appendModel(aiText);
      transcriptRef.current.completeTurn();
    }

    await flushTranscripts();

    if (isMountedRef.current) {
      setIsConnected(false);
      setIsConnecting(false);
      isAiSpeakingRef.current = false;
      setIsAiSpeaking(false);
    }
    isDisconnectingRef.current = false;
  }, [flushTranscripts]);

  const disconnectRef = useRef(disconnect);
  disconnectRef.current = disconnect;

  const connect = useCallback(async () => {
    if (isConnecting || isConnected || isDisconnectingRef.current) return;
    setIsConnecting(true);
    isSessionActiveRef.current = true;
    hasCompletedSessionRef.current = false;
    isMutedRef.current = false;
    isGreetingActiveRef.current = true;
    isAiSpeakingRef.current = false;
    setIsMuted(false);
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    userSpeechTextRef.current = '';
    aiSpeechTextRef.current = '';
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
        const playing = state === 'playing';
        isAiSpeakingRef.current = playing;
        setIsAiSpeaking(playing);
        if (state === 'idle' || state === 'stopped') {
          // Greeting shield disarms here — sole authority for opening the uplink
          isGreetingActiveRef.current = false;
        }
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

      const url = memoryId
        ? `${endpoint.ephemeralToken}?memory_id=${encodeURIComponent(memoryId)}`
        : endpoint.ephemeralToken;
      const tokenResponse = await get<unknown>(url);
      const liveToken = parseVoiceLiveToken(tokenResponse.data, voiceName ?? 'Fenrir');

      const user = useUserStore.getState().user;
      const targetMemoryId = memoryIdRef.current;

      // 1. Gather recent conversation messages from query cache or network
      let recentChatLines: string[] = [];
      if (targetMemoryId) {
        const cachedMessages = queryClient.getQueryData<any>(queryKeys.promptMessages(targetMemoryId));
        let messages = cachedMessages?.pages?.flatMap((p: any) => p.messages ?? []) ?? [];
        if (!messages.length) {
          try {
            const fetched = await get<any>(getConversationMessagesUrl(endpoint.aiPromptMessage, targetMemoryId));
            messages = fetched.data?.messages ?? [];
          } catch {
            // Non-blocking fallback
          }
        }
        recentChatLines = messages
          .slice(-12)
          .map((m: any) => {
            const role = m.role === 'user' ? (user?.nickname || 'User') : 'Memento';
            const body = (m.text || m.content || '').trim();
            return body ? `${role}: ${body}` : '';
          })
          .filter(Boolean);
      }

      // 2. Gather memory reflection topic & notes
      let memoryTitle = '';
      let memoryBody = '';
      if (targetMemoryId) {
        let mem = queryClient.getQueryData<any>(queryKeys.memory(targetMemoryId));
        if (!mem) {
          try {
            const fetchedMem = await get<any>(endpoint.memory.replace(':id', targetMemoryId));
            mem = fetchedMem.data;
          } catch {
            // Non-blocking fallback
          }
        }
        if (mem) {
          memoryTitle = (mem.title || mem.prompt_text || '').trim();
          memoryBody = (mem.body || '').trim();
        }
      }

      // 3. User insights summary
      const insights = queryClient.getQueryData<any>(queryKeys.personaMemoryInsightsSummary);
      const userInsights = insights?.summary ? `User Persona Insights: ${insights.summary}` : '';

      // 4. Assemble the grounded context block
      const contextBlocks = [
        liveToken.systemInstruction,
        userInsights,
        memoryTitle ? `REFLECTION TOPIC:\n"${memoryTitle}"` : '',
        memoryBody ? `MEMORY NOTES / DRAFT:\n"${memoryBody.slice(0, 400)}"` : '',
        recentChatLines.length > 0 ? `RECENT CONVERSATION HISTORY (Last ${recentChatLines.length} turns):\n${recentChatLines.join('\n')}` : '',
      ].filter(Boolean);

      const assembledContext = contextBlocks.join('\n\n');

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
        config: buildGeminiLiveConfig(
          liveToken.voiceName,
          user,
          assembledContext,
        ),
      });

      // Arm the greeting shield BEFORE awaiting setup-complete so that
      // microphone audio captured during the WebSocket handshake cannot
      // escape to the server and trigger false VAD interruptions.
      await engine.start((data) => {
        if (isMutedRef.current || isGreetingActiveRef.current) return;
        sessionRef.current?.sendRealtimeInput({
          audio: { data, mimeType: 'audio/pcm;rate=16000' },
        });
      });
      engine.armGreetingShield();
      await setupReady.promise;
      const userGreetingName = user?.nickname || user?.first_name || '';
      const greetingPrompt = memoryTitle
        ? `Start with a brief, warm greeting in English${userGreetingName ? ` to ${userGreetingName}` : ''}. You may briefly reference our reflection on "${memoryTitle}" and ask what they would like to explore or share today. Maintain English exclusively and never fabricate or assume past events.`
        : recentChatLines.length > 0
          ? `Start with a brief, warm greeting in English${userGreetingName ? ` to ${userGreetingName}` : ''}. Welcome them back and ask how they would like to continue our conversation today. Maintain English exclusively and do not invent past conversations.`
          : `Start with a brief, warm greeting in English${userGreetingName ? ` to ${userGreetingName}` : ''}. Then warmly invite them to share what is on their mind today. Maintain English exclusively.`;

      sessionRef.current.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: greetingPrompt,
              },
            ],
          },
        ],
        turnComplete: true,
      });
      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime((time) => time + 1);
      }, 1_000);
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

  const interrupt = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const engine = engineRef.current;
    if (!engine) return;
    const newEpoch = engine.nextEpoch();
    engine.interruptOutput(newEpoch);
    isAiSpeakingRef.current = false;
    transcriptRef.current.completeTurn();
    void flushTranscripts();
    if (isMountedRef.current) {
      setIsAiSpeaking(false);
    }
  }, [flushTranscripts]);

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
      interrupt,
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
      interrupt,
    ],
  );
}
