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
import {
  summarizeVoiceServerMessage,
  VoiceMessageHandler,
} from '@/features/chat/voice-message-handler';
import {
  VoiceTranscriptTurns,
  type VoiceTranscriptMessage,
} from '@/features/chat/voice-transcript-turns';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { serializeVoiceCallTranscript } from '@/features/chat/voice-transcript-parser';
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

const TRANSCRIPT_SETTLE_MS = 600;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

type VoiceTranscriptDiagnostics = {
  rawMessages: number;
  setupComplete: number;
  interrupted: number;
  turnComplete: number;
  outputAudioFrames: number;
  inputTranscriptFrames: number;
  interimInputTranscriptFrames: number;
  outputTranscriptFrames: number;
  outputTranscriptFinished: number;
  inputTranscriptCharacters: number;
  interimInputTranscriptCharacters: number;
  outputTranscriptCharacters: number;
  seenEventShapes: Set<string>;
};

function createVoiceTranscriptDiagnostics(): VoiceTranscriptDiagnostics {
  return {
    rawMessages: 0,
    setupComplete: 0,
    interrupted: 0,
    turnComplete: 0,
    outputAudioFrames: 0,
    inputTranscriptFrames: 0,
    interimInputTranscriptFrames: 0,
    outputTranscriptFrames: 0,
    outputTranscriptFinished: 0,
    inputTranscriptCharacters: 0,
    interimInputTranscriptCharacters: 0,
    outputTranscriptCharacters: 0,
    seenEventShapes: new Set<string>(),
  };
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
  const transcriptDiagnosticsRef = useRef(createVoiceTranscriptDiagnostics());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimeRef = useRef(0);
  const userSpeechTextRef = useRef('');
  const aiSpeechTextRef = useRef('');
  const pendingTurnCompleteRef = useRef(false);
  const outputTranscriptFinishedRef = useRef(false);
  const pendingTurnCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memoryIdRef = useRef(memoryId);
  if (memoryId && /^[0-9a-fA-F]{24}$/.test(memoryId)) {
    memoryIdRef.current = memoryId;
  }

  const persistVoiceMessages = useCallback(
    async (messages: VoiceTranscriptMessage[]): Promise<boolean> => {
      if (!messages.length) return true;
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
        messages,
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
        return true;
      } catch (error) {
        logger.error('Failed to save voice transcript', error);
        return false;
      }
    },
    [],
  );

  const handleLiveMessage = useCallback(
    (message: LiveServerMessage) => {
      const summary = summarizeVoiceServerMessage(message);
      const diagnostics = transcriptDiagnosticsRef.current;
      diagnostics.rawMessages += 1;
      diagnostics.setupComplete += summary.setupComplete ? 1 : 0;
      diagnostics.interrupted += summary.interrupted ? 1 : 0;
      diagnostics.turnComplete += summary.turnComplete ? 1 : 0;
      diagnostics.outputAudioFrames += summary.outputAudioFrames;
      diagnostics.inputTranscriptFrames += summary.inputTranscriptLength > 0 ? 1 : 0;
      diagnostics.interimInputTranscriptFrames +=
        summary.interimInputTranscriptLength > 0 ? 1 : 0;
      diagnostics.outputTranscriptFrames +=
        summary.outputTranscriptLength > 0 || summary.outputTranscriptFinished ? 1 : 0;
      diagnostics.outputTranscriptFinished += summary.outputTranscriptFinished ? 1 : 0;
      diagnostics.inputTranscriptCharacters += summary.inputTranscriptLength;
      diagnostics.interimInputTranscriptCharacters += summary.interimInputTranscriptLength;
      diagnostics.outputTranscriptCharacters += summary.outputTranscriptLength;

      const eventShape = summary.serverContentKeys.join(',') || 'no-server-content';
      const isNewEventShape = !diagnostics.seenEventShapes.has(eventShape);
      diagnostics.seenEventShapes.add(eventShape);
      const hasTranscriptOrControlEvent =
        summary.setupComplete ||
        summary.interrupted ||
        summary.turnComplete ||
        summary.inputTranscriptLength > 0 ||
        summary.interimInputTranscriptLength > 0 ||
        summary.outputTranscriptLength > 0 ||
        summary.outputTranscriptFinished;
      if (isNewEventShape || hasTranscriptOrControlEvent) {
        logger.runtime('[VoiceMode] Gemini event', {
          sequence: diagnostics.rawMessages,
          ...summary,
        });
      }

      const engine = engineRef.current;
      const currentEpoch = engine?.getEpoch() ?? 1;
      for (const effect of messageHandlerRef.current.handle(message, currentEpoch)) {
        if (effect.type === 'setup-complete') {
          engine?.markSetupComplete();
          setupReadyRef.current?.resolve();
        } else if (effect.type === 'interrupted') {
          // Server confirmed interruption — engine owns the new epoch.
          // handleInterruption() promotes any interim user text to final so
          // it isn't lost when we complete the (truncated) model turn.
          const newEpoch = engine?.nextEpoch() ?? 1;
          engine?.interruptOutput(newEpoch);
          if (greetingTimerRef.current) {
            clearTimeout(greetingTimerRef.current);
            greetingTimerRef.current = null;
          }
          isGreetingActiveRef.current = false;
          engine?.disarmGreetingShield();
          isAiSpeakingRef.current = false;
          pendingTurnCompleteRef.current = false;
          if (pendingTurnCompleteTimerRef.current) {
            clearTimeout(pendingTurnCompleteTimerRef.current);
            pendingTurnCompleteTimerRef.current = null;
          }
          transcriptRef.current.handleInterruption();
          transcriptRef.current.completeTurn();
          outputTranscriptFinishedRef.current = false;
          if (isMountedRef.current) setIsAiSpeaking(false);
        } else if (effect.type === 'output-audio') {
          if (engine?.enqueueOutput(effect.data, effect.epoch) && isMountedRef.current) {
            isAiSpeakingRef.current = true;
            setIsAiSpeaking(true);
          }
        } else if (effect.type === 'input-transcript') {
          const text = transcriptRef.current.appendUser(effect.text, effect.isInterim);
          userSpeechTextRef.current = text;
          if (isMountedRef.current) setUserSpeechText(text);
        } else if (effect.type === 'output-transcript') {
          outputTranscriptFinishedRef.current = effect.finished;
          if (effect.text) {
            const text = transcriptRef.current.appendModel(effect.text);
            aiSpeechTextRef.current = text;
            if (isMountedRef.current) setAiSpeechText(text);
          }
          if (effect.finished) {
            if (pendingTurnCompleteRef.current) {
              pendingTurnCompleteRef.current = false;
              if (pendingTurnCompleteTimerRef.current) {
                clearTimeout(pendingTurnCompleteTimerRef.current);
                pendingTurnCompleteTimerRef.current = null;
              }
              transcriptRef.current.settlePendingTurn();
              outputTranscriptFinishedRef.current = false;
            }
          }
        } else if (effect.type === 'turn-complete') {
          engine?.finishOutputTurn();
          // Transcription is explicitly independent of modelTurn ordering in
          // Gemini Live. Give a final transcription frame a bounded grace
          // period; `finished` can settle this earlier when the model sends it.
          transcriptRef.current.beginTurnCompletion();
          if (outputTranscriptFinishedRef.current) {
            outputTranscriptFinishedRef.current = false;
            pendingTurnCompleteRef.current = false;
            transcriptRef.current.settlePendingTurn();
            continue;
          }
          pendingTurnCompleteRef.current = true;
          if (pendingTurnCompleteTimerRef.current) {
            clearTimeout(pendingTurnCompleteTimerRef.current);
          }
          pendingTurnCompleteTimerRef.current = setTimeout(() => {
            if (!pendingTurnCompleteRef.current) return;
            pendingTurnCompleteRef.current = false;
            pendingTurnCompleteTimerRef.current = null;
            outputTranscriptFinishedRef.current = false;
            transcriptRef.current.settlePendingTurn();
          }, TRANSCRIPT_SETTLE_MS);
        }
      }
    },
    [],
  );

  const disconnect = useCallback(async () => {
    if (isDisconnectingRef.current) return;
    if (hasCompletedSessionRef.current || !isSessionActiveRef.current) return;
    isDisconnectingRef.current = true;
    hasCompletedSessionRef.current = true;
    isSessionActiveRef.current = false;
    isMutedRef.current = true;
    if (greetingTimerRef.current) {
      clearTimeout(greetingTimerRef.current);
      greetingTimerRef.current = null;
    }
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

    // Keep the socket alive for one bounded settle window after microphone
    // shutdown. Gemini transcription frames are independent from modelTurn and
    // can arrive after turnComplete or after the final audio chunk.
    await wait(TRANSCRIPT_SETTLE_MS);
    if (pendingTurnCompleteTimerRef.current) {
      clearTimeout(pendingTurnCompleteTimerRef.current);
      pendingTurnCompleteTimerRef.current = null;
    }
    pendingTurnCompleteRef.current = false;
    outputTranscriptFinishedRef.current = false;
    transcriptRef.current.settlePendingTurn();

    const session = sessionRef.current;
    sessionRef.current = null;
    session?.close();
    if (transcriptRef.current.hasActiveTranscript()) {
      transcriptRef.current.completeTurn();
    }
    const sessionTurns = transcriptRef.current.getSessionTurns();
    transcriptRef.current.drainCompleted();

    const flattenedSessionMessages = sessionTurns.flatMap((turn) => turn.messages);

    const formattedDuration = formatVoiceCallDuration(finalDuration);

    let callRecordText = '';
    if (sessionTurns.length > 0) {
      const flattened = sessionTurns.flatMap((turn) => turn.messages);
      callRecordText = serializeVoiceCallTranscript(formattedDuration, flattened);
    } else if (finalDuration >= 3) {
      const userText = userSpeechTextRef.current.trim();
      const aiText =
        aiSpeechTextRef.current.trim() &&
        !aiSpeechTextRef.current.includes('Ready to connect') &&
        !aiSpeechTextRef.current.includes('Connecting')
          ? aiSpeechTextRef.current.trim()
          : '';

      const fallbackTurns: Array<{ role: 'user' | 'ai'; text: string }> = [];
      if (userText) fallbackTurns.push({ role: 'user', text: userText });
      if (aiText) fallbackTurns.push({ role: 'ai', text: aiText });

      callRecordText = serializeVoiceCallTranscript(formattedDuration, fallbackTurns);
    }

    const transcriptPersisted = callRecordText
      ? await persistVoiceMessages([
          {
            role: 'ai',
            text: callRecordText,
            is_voice: true,
            duration: finalDuration,
          },
        ])
      : false;

    logger.runtime('[VoiceMode] transcript metrics', {
      ...transcriptDiagnosticsRef.current,
      seenEventShapes: [...transcriptDiagnosticsRef.current.seenEventShapes],
      durationSeconds: finalDuration,
      sessionTurns: sessionTurns.length,
      sessionMessages: flattenedSessionMessages.length,
      userTranscriptCharacters: flattenedSessionMessages
        .filter((message) => message.role === 'user')
        .reduce((total, message) => total + message.text.length, 0),
      outputTranscriptCharactersSaved: flattenedSessionMessages
        .filter((message) => message.role === 'ai')
        .reduce((total, message) => total + message.text.length, 0),
      fallbackUserCharacters: userSpeechTextRef.current.trim().length,
      fallbackOutputCharacters: aiSpeechTextRef.current.trim().length,
      callRecordCharacters: callRecordText.length,
      callRecordHasTranscript: callRecordText.includes('--- Transcript ---'),
      transcriptPersisted,
    });

    if (isMountedRef.current) {
      setIsConnected(false);
      setIsConnecting(false);
      isAiSpeakingRef.current = false;
      setIsAiSpeaking(false);
    }
    isDisconnectingRef.current = false;
  }, [persistVoiceMessages]);

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
    pendingTurnCompleteRef.current = false;
    outputTranscriptFinishedRef.current = false;
    if (pendingTurnCompleteTimerRef.current) {
      clearTimeout(pendingTurnCompleteTimerRef.current);
      pendingTurnCompleteTimerRef.current = null;
    }
    setAiSpeechText('Connecting secure voice link...');
    setUserSpeechText('');
    setConnectionFailure(null);
    transcriptRef.current = new VoiceTranscriptTurns();
    transcriptDiagnosticsRef.current = createVoiceTranscriptDiagnostics();
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
          if (greetingTimerRef.current) {
            clearTimeout(greetingTimerRef.current);
            greetingTimerRef.current = null;
          }
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
      if (liveToken.memoryId) memoryIdRef.current = liveToken.memoryId;

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
        // The token locks the real config server-side. This only satisfies the SDK.
        config: buildGeminiLiveConfig(liveToken.voiceName, user),
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
      const greetingPrompt =
        liveToken.greetingInstruction ??
        `Start with a brief, warm greeting in English${
          userGreetingName ? ` to ${userGreetingName}` : ''
        }. Then let them lead.`;

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

      // Safety guard: The greeting shield prevents the model's initial spoken greeting
      // from leaking into the microphone and causing self-interruption.
      // It automatically disarms after 4.5 seconds if playback state has not already disarmed it.
      if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
      greetingTimerRef.current = setTimeout(() => {
        isGreetingActiveRef.current = false;
        engineRef.current?.disarmGreetingShield();
      }, 4500);

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
    if (greetingTimerRef.current) {
      clearTimeout(greetingTimerRef.current);
      greetingTimerRef.current = null;
    }
    isGreetingActiveRef.current = false;
    engine.disarmGreetingShield();
    isAiSpeakingRef.current = false;
    transcriptRef.current.completeTurn();
    if (isMountedRef.current) {
      setIsAiSpeaking(false);
    }
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
