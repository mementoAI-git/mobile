import { currentDigitalMindName, currentDigitalMindHeaders } from '@/features/chat/digital-mind-runtime';
import {
  callLimitPrompts,
  callLimitSchedule,
  isCallTimeUp,
  type VoiceCallTime,
} from '@/features/chat/voice-call-limit';
import { PlaybackLevelMeter } from '@/features/chat/voice-effect-level';
import { voiceLanguageInstruction } from '@/features/chat/voice-language';
import { sendVoiceText } from '@/features/chat/voice-text-input';
import { useVoicePreferenceStore } from '@/store/voice-preference.store';
import type { LiveServerMessage, Session } from '@google/genai/web';
import NetInfo from '@react-native-community/netinfo';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import endpoint from '@/api/endpoint';
import type { VoiceChatSession } from '@/features/chat/voice-chat-timeline';
import { get, post } from '@/api/mutations';
import { VoiceAudioEngine } from '@/features/chat/voice-audio-engine';
import { resolveVoiceAudioPolicy } from '@/features/chat/voice-audio-policy';
import {
  getVoiceConnectionFailure,
  type VoiceConnectionFailure,
} from '@/features/chat/voice-entitlement';
import {
  buildGeminiLiveConfig,
  parseVoiceLiveToken,
  type VoiceLiveToken,
} from '@/features/chat/voice-live-config';
import {
  summarizeVoiceServerMessage,
  VoiceMessageHandler,
} from '@/features/chat/voice-message-handler';
import {
  VoiceTranscriptTurns,
  type VoiceTranscriptMessage,
} from '@/features/chat/voice-transcript-turns';
import { VoiceTurnSync } from '@/features/chat/voice-turn-sync';
import { buildVoiceCallEndBody, voiceCallEndPath } from '@/features/chat/voice-call-records';
import {
  createCallNotificationAdapter,
  VoiceCallNotification,
} from '@/features/chat/voice-call-notification';
import {
  shouldReconnectOnNetworkChange,
  type NetworkSnapshot,
} from '@/features/chat/voice-network';
import { createThrottledSetter, type ThrottledSetter } from '@/features/chat/voice-throttle';
import {
  SEARCH_MEMORIES_TOOL,
  VOICE_MEMORY_SEARCH_TIMEOUT_MS,
  VoiceToolRelay,
} from '@/features/chat/voice-tool-relay';
import {
  buildEphemeralTokenUrl,
  VOICE_CLIENT_CAPABILITIES,
} from '@/features/chat/voice-token-url';
import {
  CALL_ACTION_TOOLS,
  createCallActionHandlers,
  resolveVoiceDestination,
} from '@/features/chat/voice-call-actions';
import { GoodbyeTracker } from '@/features/chat/voice-goodbye';
import { saveUplinkRecording, VoiceUplinkRecorder } from '@/features/chat/voice-uplink-recorder';
import { saveGateCapture, VoiceGateCapture } from '@/features/chat/voice-gate-capture';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { VoiceLatencyTracker } from '@/features/chat/voice-latency';
import { reportVoiceCall, type VoiceCallFailure } from '@/features/chat/voice-telemetry';
import { shouldRestore, VoiceSelfInterruptGuard } from '@/features/chat/voice-self-interrupt-guard';
import { voiceControl } from '@/features/voice-control/registry';
import {
  SCREEN_CONTROL_TOOLS,
  createScreenControlHandlers,
} from '@/features/voice-control/tools';
import { router as expoRouter } from 'expo-router';
import {
  VOICE_SERVER_TOOL_TIMEOUT_MS,
  createServerToolHandlers,
} from '@/features/chat/voice-server-tools';
import { VoiceTokenPrefetch } from '@/features/chat/voice-token-prefetch';
import {
  VOICE_WARM_START_MAX_AGE_MS,
  VoiceMessageBuffer,
  VoiceWarmStart,
  type WarmCall,
} from '@/features/chat/voice-warm-start';
import { VoiceResponseGate } from '@/features/chat/voice-response-gate';
import { getVoiceCallOutbox } from '@/features/chat/voice-call-outbox-store';
import type { VoiceCallOutbox } from '@/features/chat/voice-call-outbox';
import {
  nextReconnectDelay,
  VOICE_SETUP_TIMEOUT_MS,
  VOICE_TOKEN_TIMEOUT_MS,
  VoiceTransports,
  withDeadline,
} from '@/features/chat/voice-connection';
import type { VoiceTurnDetection } from '@/features/chat/voice-live-config';
import { serializeVoiceCallTranscript } from '@/features/chat/voice-transcript-parser';
import { isPermissionGranted } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { logger } from '@/lib/logger';
import { makeMutable } from 'react-native-reanimated';
import { VoiceThinkingTracker } from '@/features/chat/voice-thinking';
import { parseHybridEndMs, VoiceHybridEnd } from '@/features/chat/voice-hybrid-end';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
import { CallRecordingSession } from '@/features/chat/call-recording';
import { toast } from '@/components/ui/Toast';
import { discardCallRecording, drainCallRecordings, finishCallRecording, getCallRecorderNative, newCallRecordingPath } from '@/features/chat/call-recording-store';
import { invalidateMemoryQueries } from '@/features/memories/cache';
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
const TRANSCRIPT_UI_INTERVAL_MS = 100;
// Tool calls this build can relay. The API locks matching tools into the session.
const CLIENT_CAPABILITIES = VOICE_CLIENT_CAPABILITIES;
// iOS voice processing is off by default, and full duplex on iOS depends on it.
const VOICE_AUDIO_POLICY = resolveVoiceAudioPolicy({
  platform: Platform.OS,
  fullDuplexRequested: process.env.EXPO_PUBLIC_VOICE_FULL_DUPLEX === 'true',
  iosVoiceProcessingRequested: process.env.EXPO_PUBLIC_VOICE_IOS_VOICE_PROCESSING === 'true',
});
const SPEAKER_FULL_DUPLEX = VOICE_AUDIO_POLICY.speakerFullDuplex;
// While the self-interruption fallback lasts, how often to check whether the
// echo has dropped enough to listen while Memento talks again.
const VOICE_FALLBACK_RECHECK_MS = 15_000;
// Prepare the call (session open, greeting asked for) while the user looks at
// the Start button, so the tap plays the greeting at once. Off with 'false'.
const VOICE_WARM_START = process.env.EXPO_PUBLIC_VOICE_WARM_START !== 'false';
// A prepared call is replaced before it goes stale, this many times per visit
// to the call screen, so lingering on it does not keep spending tokens.
const VOICE_WARM_START_REFRESHES = 3;
// Development only: save the mic audio sent to Gemini as a WAV for inspection.
const DEBUG_RECORD_UPLINK = __DEV__ && process.env.EXPO_PUBLIC_VOICE_DEBUG_RECORD === 'true';
// Development only: save the raw mic and speaker state for replay through the
// echo gate (voice-gate-replay.ts).
const DEBUG_CAPTURE_GATE = __DEV__ && process.env.EXPO_PUBLIC_VOICE_DEBUG_CAPTURE === 'true';
// Experimental, off by default: tell Gemini the user has finished after this
// much quiet instead of waiting for its silence window (voice-hybrid-end.ts).
const HYBRID_END_MS = parseHybridEndMs(process.env.EXPO_PUBLIC_VOICE_HYBRID_END_MS);
// About 10 s in total, enough to ride out a tunnel or a network switch.
type ReconnectReason = 'go-away' | 'connection-lost' | 'network-change';
/** `in-progress`: another reconnect is already running. `ended`: the call ended meanwhile. */
type ReconnectResult = 'reconnected' | 'in-progress' | 'unavailable' | 'failed' | 'ended';

/** Close code and reason of a socket that closed unexpectedly. */
type SocketClose = { code?: number; reason?: string };

function describeSocketClose(event: unknown): SocketClose {
  const value = event as { code?: unknown; reason?: unknown } | null;
  return {
    code: typeof value?.code === 'number' ? value.code : undefined,
    reason: typeof value?.reason === 'string' && value.reason ? value.reason.slice(0, 120) : undefined,
  };
}

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
  /** Mic frames (100 ms each) sent to Gemini, or dropped by this hook's gates. */
  micFramesSent: number;
  micFramesDroppedMuted: number;
  micFramesDroppedGreeting: number;
  micFramesDroppedOffline: number;
  /** Names of tool calls Gemini made, in order. */
  toolCalls: string[];
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
    micFramesSent: 0,
    micFramesDroppedMuted: 0,
    micFramesDroppedGreeting: 0,
    micFramesDroppedOffline: 0,
    toolCalls: [],
  };
}

/** Message and HTTP status from an Error or a normalized API error. */
function describeVoiceError(error: unknown): { message: string; status?: number } {
  const value = error as { message?: unknown; status?: unknown } | null;
  const message =
    typeof value?.message === 'string' && value.message ? value.message : String(error);
  return { message, status: typeof value?.status === 'number' ? value.status : undefined };
}

function validMemoryId(memoryId?: string | null): string | undefined {
  return memoryId && /^[0-9a-fA-F]{24}$/.test(memoryId) ? memoryId : undefined;
}

/** Identifies what a session token was built for. */
function voiceTokenKey(memoryId: string | undefined, voiceName: string | undefined): string {
  return [useUserStore.getState().user?._id ?? '', memoryId ?? '', voiceName ?? '', useVoicePreferenceStore.getState().languageCode, currentDigitalMindName() ?? ''].join('|');
}

function fetchVoiceToken(memoryId: string | undefined) {
  return get<unknown>(
    buildEphemeralTokenUrl(endpoint.ephemeralToken, {
      memoryId,
      deviceModel: Device.modelName,
      capabilities: CLIENT_CAPABILITIES,
    }),
    { timeout: VOICE_TOKEN_TIMEOUT_MS, headers: currentDigitalMindHeaders() },
  );
}

/** What Memento is asked to open the call with. */
function greetingPromptFor(liveToken: VoiceLiveToken): string {
  const user = useUserStore.getState().user;
  const name = user?.nickname || user?.first_name || '';
  const language = voiceLanguageInstruction(useVoicePreferenceStore.getState().languageCode);
  return (
    liveToken.greetingInstruction ??
    `Start with a brief, warm greeting in the selected conversation language${name ? ` to ${name}` : ''}. Then let them lead.`
  ) + ' ' + language;
}

function syncCompletedTurnsInto(
  sync: VoiceTurnSync,
  transcript: VoiceTranscriptTurns,
): void {
  const completed = transcript.drainCompleted();
  if (completed.length) sync.addTurns(completed);
}

/** App-level effects of call actions, supplied by the call provider. */
export type VoiceCallActionEffects = {
  /** Open a screen while the call keeps going. */
  navigate(href: string): void;
  /** The model ended the call; leave the call screen if it is open. */
  onModelEndedCall(): void;
};

export function useVoiceMode({
  memoryId,
  voiceName,
  callActions,
}: {
  memoryId?: string | null;
  voiceName?: string;
  callActions?: VoiceCallActionEffects;
} = {}) {
  const languageCode = useVoicePreferenceStore(state => state.languageCode);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  /**
   * True from the moment the call is hung up until teardown and transcript
   * saving finish. Call surfaces hide as soon as this turns true.
   */
  const [isEnding, setIsEnding] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [aiSpeechText, setAiSpeechText] = useState('Ready to connect secure voice link...');
  const [userSpeechText, setUserSpeechText] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  // Memento heard the user and is working on a reply (see VoiceThinkingTracker).
  const [isThinking, setIsThinking] = useState(false);
  const [connectionFailure, setConnectionFailure] = useState<VoiceConnectionFailure | null>(null);
  const [voiceTimeline, setVoiceTimeline] = useState<VoiceChatSession | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const resumeHandleRef = useRef<string | null>(null);
  /** The call's time-limit ticket, sent back on reconnect; null when calls are not limited. */
  const callTicketRef = useRef<string | null>(null);
  const callLimitTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reconnectingRef = useRef(false);
  const reconnectRef = useRef<(reason: ReconnectReason) => Promise<ReconnectResult>>(
    async () => 'unavailable',
  );
  // Which socket may deliver call events (see VoiceTransports).
  const transportsRef = useRef<VoiceTransports | null>(null);
  transportsRef.current ??= new VoiceTransports();
  const connectionLostRef = useRef<
    (closed: Session | null, isError: boolean, close?: SocketClose) => Promise<void>
  >(async () => undefined);
  const engineRef = useRef<VoiceAudioEngine | null>(null);
  const messageHandlerRef = useRef(new VoiceMessageHandler());
  const setupReadyRef = useRef<SetupReady | null>(null);
  const isMutedRef = useRef(false);
  const isGreetingActiveRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  // The level of Memento's voice at the moment it is heard, for the voice beam.
  const playbackMeterRef = useRef(new PlaybackLevelMeter());
  const getPlaybackLevel = useCallback(() => {
    const engine = engineRef.current;
    return engine ? playbackMeterRef.current.level(engine.queueDepthMs()) : 0;
  }, []);
  const isMountedRef = useRef(true);
  const isDisconnectingRef = useRef(false);
  const isSessionActiveRef = useRef(false);
  const hasCompletedSessionRef = useRef(false);
  const sessionIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  // The conversation being recorded (when recording is on and the build supports it).
  const callRecordingRef = useRef<CallRecordingSession | null>(null);
  const [isRecordingCall, setIsRecordingCall] = useState(false);
  const transcriptRef = useRef(new VoiceTranscriptTurns());
  const timelineRef = useRef<Omit<VoiceChatSession, 'messages'> | null>(null);
  const timelineTimesRef = useRef(new Map<number, string>());
  const timelineConnectedRef = useRef(false);
  const publishTimelineRef = useRef<() => void>(() => {});
  const turnSyncRef = useRef<VoiceTurnSync | null>(null);
  // On-device copy of this call's unsaved turns and its end (see VoiceCallOutbox).
  const outboxRef = useRef<VoiceCallOutbox | null>(null);
  const toolRelayRef = useRef<VoiceToolRelay | null>(null);
  const uplinkRecorderRef = useRef<VoiceUplinkRecorder | null>(null);
  const gateCaptureRef = useRef<VoiceGateCapture | null>(null);
  const callActionsRef = useRef(callActions);
  callActionsRef.current = callActions;
  const goodbyeRef = useRef<{
    tracker: GoodbyeTracker;
    timer: ReturnType<typeof setInterval>;
    then?: () => void;
  } | null>(null);
  const fullDuplexRef = useRef(SPEAKER_FULL_DUPLEX);
  const networkUnsubscribeRef = useRef<(() => void) | null>(null);
  const lastNetworkRef = useRef<NetworkSnapshot | undefined>(undefined);
  const callNotificationRef = useRef<VoiceCallNotification | null>(null);
  if (!callNotificationRef.current) {
    callNotificationRef.current = new VoiceCallNotification(
      createCallNotificationAdapter(Platform.OS),
    );
  }
  const userTextSetterRef = useRef<ThrottledSetter<string> | null>(null);
  const aiTextSetterRef = useRef<ThrottledSetter<string> | null>(null);
  if (!userTextSetterRef.current) {
    userTextSetterRef.current = createThrottledSetter((text: string) => {
      if (isMountedRef.current) {
        setUserSpeechText(text);
        publishTimelineRef.current();
      }
    }, TRANSCRIPT_UI_INTERVAL_MS);
  }
  if (!aiTextSetterRef.current) {
    aiTextSetterRef.current = createThrottledSetter((text: string) => {
      if (isMountedRef.current) {
        setAiSpeechText(text);
        publishTimelineRef.current();
      }
    }, TRANSCRIPT_UI_INTERVAL_MS);
  }
  const transcriptDiagnosticsRef = useRef(createVoiceTranscriptDiagnostics());
  const latencyRef = useRef<VoiceLatencyTracker | null>(null);
  const thinkingRef = useRef(new VoiceThinkingTracker());
  const hybridEndRef = useRef(new VoiceHybridEnd(HYBRID_END_MS));
  const hybridTurnEndsRef = useRef(0);
  // Loudness of what the mic sends (0..1), for the call screen's level ring.
  const micLevelRef = useRef(makeMutable(0));
  const selfInterruptRef = useRef<VoiceSelfInterruptGuard | null>(null);
  // Development only: a timestamped trace of the speaker filter's view.
  const debugTraceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debugMicPeakRef = useRef(0);
  const selfInterruptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Full duplex as the build and the server allow it, before any fallback. */
  const allowedFullDuplexRef = useRef(false);
  const liveModelRef = useRef<string | undefined>(undefined);
  const turnDetectionRef = useRef<VoiceTurnDetection | undefined>(undefined);
  const tokenPrefetchedRef = useRef(false);
  // First failure of the current call, reported to Sentry when it ends.
  const failureRef = useRef<VoiceCallFailure | null>(null);
  // Gemini's reported token usage for this call (see VoiceCallReport.usage).
  const usageRef = useRef<{ lastPromptTokens?: number; maxTotalTokens?: number }>({});
  // The connect step in progress; null once connected. A call that ends while
  // it is set ended before it ever connected.
  const connectStepRef = useRef<string | null>(null);
  // Drops the rest of a response the user abandoned with the Interrupt button.
  const responseGateRef = useRef<VoiceResponseGate | null>(null);
  responseGateRef.current ??= new VoiceResponseGate();
  const tokenPrefetchRef = useRef<VoiceTokenPrefetch | null>(null);
  tokenPrefetchRef.current ??= new VoiceTokenPrefetch();
  // The call prepared on the call screen (see voice-warm-start.ts), the one
  // being prepared, and whether the current call started from one.
  const warmStartRef = useRef<VoiceWarmStart<Session, VoiceLiveToken, LiveServerMessage> | null>(
    null,
  );
  warmStartRef.current ??= new VoiceWarmStart();
  // `claimed`: a call is waiting for it, so nothing else may cancel it.
  const warmingRef = useRef<{ key: string; ready: Promise<void>; claimed: boolean } | null>(null);
  const warmRefreshRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; left: number }>({
    timer: null,
    left: VOICE_WARM_START_REFRESHES,
  });
  const warmStartedRef = useRef(false);
  // Bumped by each connect(), so an older connect that is still awaiting can
  // tell it was superseded.
  const connectAttemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const resolveTargetMemoryId = useCallback((): string | undefined => {
    const cachedProfile = queryClient.getQueryData<any>(queryKeys.profile);
    const userPrimaryId =
      useUserStore.getState().user?.primary_conversation_id ??
      useAuthStore.getState().user?.primary_conversation_id ??
      cachedProfile?.primary_conversation_id;
    const rawTargetId = memoryIdRef.current || userPrimaryId;
    return rawTargetId && /^[0-9a-fA-F]{24}$/.test(rawTargetId) ? rawTargetId : undefined;
  }, []);

  publishTimelineRef.current = () => {
    const timeline = timelineRef.current;
    if (!timeline || !isMountedRef.current) return;
    const transcript = transcriptRef.current.getTimelineMessages();
    callRecordingRef.current?.noteTurns(transcript);
    if (!timelineConnectedRef.current && transcript.length === 0) return;
    const messages = transcript.map((message, index) => {
      if (!timelineTimesRef.current.has(index)) timelineTimesRef.current.set(index, new Date().toISOString());
      return {
        ...message,
        _id: `voice-live-${timeline.id}-${index}`,
        voice_session_id: timeline.id,
        voice_turn_index: index,
        created_at: timelineTimesRef.current.get(index),
        isLive: !timeline.endedAt,
      };
    });
    setVoiceTimeline({ ...timeline, memoryId: resolveTargetMemoryId(), messages });
  };

  const persistVoiceMessages = useCallback(
    async (messages: VoiceTranscriptMessage[]): Promise<boolean> => {
      if (!messages.length) return true;
      const targetMemoryId = resolveTargetMemoryId();

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
        logger.handledError('Failed to save voice transcript', error);
        return false;
      }
    },
    [resolveTargetMemoryId],
  );

  const syncCompletedTurns = useCallback((interruptedLast = false) => {
    publishTimelineRef.current();
    const completed = transcriptRef.current.drainCompleted();
    if (__DEV__ && completed.length) logger.runtime('[VoiceMode] turns', completed);
    if (completed.length) turnSyncRef.current?.addTurns(completed, { interruptedLast });
  }, []);

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
          latencyRef.current?.mark('setupComplete');
          engine?.markSetupComplete();
        } else if (effect.type === 'usage') {
          const usage = usageRef.current;
          if (effect.promptTokens !== undefined) usage.lastPromptTokens = effect.promptTokens;
          if (effect.totalTokens !== undefined) {
            usage.maxTotalTokens = Math.max(usage.maxTotalTokens ?? 0, effect.totalTokens);
          }
        } else if (effect.type === 'resumption-handle') {
          resumeHandleRef.current = effect.handle;
        } else if (effect.type === 'tool-call') {
          const names = effect.calls.map((call) => call.name);
          transcriptDiagnosticsRef.current.toolCalls.push(...names);
          latencyRef.current?.observeToolCall();
          thinkingRef.current.observeToolCall();
          logger.runtime('[VoiceMode] tool calls', { names });
          void toolRelayRef.current?.handle(effect.calls);
        } else if (effect.type === 'tool-call-cancellation') {
          toolRelayRef.current?.cancel(effect.ids);
        } else if (effect.type === 'go-away') {
          logger.runtime('[VoiceMode] go-away', { timeLeftMs: effect.timeLeftMs });
          void reconnectRef.current('go-away').then((result) =>
            endCallIfReconnectFailedRef.current(result, 'go-away'),
          );
        } else if (effect.type === 'interrupted') {
          responseGateRef.current?.endTurn();
          // Server confirmed interruption — engine owns the new epoch.
          // handleInterruption() promotes any interim user text to final so
          // it isn't lost when we complete the (truncated) model turn.
          latencyRef.current?.observeModelTurnEnd({ interruptedBy: 'speech' });
          thinkingRef.current.reset();
          selfInterruptRef.current?.observeInterrupted(
            engine?.isSpeakerFullDuplexActive() ?? false,
            // The user was already talking as this reply started: an early
            // interruption is them, so judge it by its words, not its timing.
            engine?.userContinuedIntoReply() ? undefined : engine?.audibleForMs(),
          );
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
          playbackMeterRef.current.reset();
          transcriptRef.current.handleInterruption();
          transcriptRef.current.completeTurn();
          syncCompletedTurns(true);
          outputTranscriptFinishedRef.current = false;
          if (isMountedRef.current) setIsAiSpeaking(false);
        } else if (effect.type === 'output-audio') {
          if (responseGateRef.current?.acceptOutput() === false) continue;
          latencyRef.current?.observeModelAudio();
          thinkingRef.current.reset();
          selfInterruptRef.current?.observeModelAudio();
          goodbyeRef.current?.tracker.onModelAudio();
          if (engine?.enqueueOutput(effect.data, effect.epoch) && isMountedRef.current) {
            playbackMeterRef.current.push(effect.data);
            isAiSpeakingRef.current = true;
            setIsAiSpeaking(true);
          }
        } else if (effect.type === 'input-transcript') {
          latencyRef.current?.observeUserTranscript();
          if (!effect.isInterim || effect.text) thinkingRef.current.observeUserTranscript();
          selfInterruptRef.current?.observeInputText(effect.text, effect.isInterim);
          const text = transcriptRef.current.appendUser(effect.text, effect.isInterim);
          userSpeechTextRef.current = text;
          userTextSetterRef.current?.set(text);
        } else if (effect.type === 'output-transcript') {
          if (responseGateRef.current?.acceptTranscript() === false) continue;
          selfInterruptRef.current?.observeOutputText(effect.text);
          outputTranscriptFinishedRef.current = effect.finished;
          if (effect.text) {
            const text = transcriptRef.current.appendModel(effect.text);
            aiSpeechTextRef.current = text;
            aiTextSetterRef.current?.set(text);
          }
          if (effect.finished) {
            if (pendingTurnCompleteRef.current) {
              pendingTurnCompleteRef.current = false;
              if (pendingTurnCompleteTimerRef.current) {
                clearTimeout(pendingTurnCompleteTimerRef.current);
                pendingTurnCompleteTimerRef.current = null;
              }
              transcriptRef.current.settlePendingTurn();
              syncCompletedTurns();
              outputTranscriptFinishedRef.current = false;
            }
          }
        } else if (effect.type === 'turn-complete') {
          const { discarded } = responseGateRef.current?.endTurn() ?? { discarded: false };
          latencyRef.current?.observeModelTurnEnd();
          engine?.finishOutputTurn();
          // A turn with no reply audio (tool only) still ends the wait.
          if (!isAiSpeakingRef.current) thinkingRef.current.reset();
          goodbyeRef.current?.tracker.onTurnComplete();
          // The Interrupt button already completed and synced this turn.
          if (discarded) continue;
          // Transcription is explicitly independent of modelTurn ordering in
          // Gemini Live. Give a final transcription frame a bounded grace
          // period; `finished` can settle this earlier when the model sends it.
          transcriptRef.current.beginTurnCompletion();
          if (outputTranscriptFinishedRef.current) {
            outputTranscriptFinishedRef.current = false;
            pendingTurnCompleteRef.current = false;
            transcriptRef.current.settlePendingTurn();
            syncCompletedTurns();
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
            syncCompletedTurns();
          }, TRANSCRIPT_SETTLE_MS);
        }
      }
    },
    [syncCompletedTurns],
  );

  const disconnect = useCallback(async () => {
    if (isDisconnectingRef.current) return;
    if (hasCompletedSessionRef.current || !isSessionActiveRef.current) return;
    isDisconnectingRef.current = true;
    hasCompletedSessionRef.current = true;
    isSessionActiveRef.current = false;
    isMutedRef.current = true;
    if (isMountedRef.current) setIsEnding(true);
    if (timelineRef.current) {
      timelineRef.current.endedAt = new Date().toISOString();
      publishTimelineRef.current();
    }
    networkUnsubscribeRef.current?.();
    networkUnsubscribeRef.current = null;
    lastNetworkRef.current = undefined;
    callLimitTimersRef.current.forEach(clearTimeout);
    callLimitTimersRef.current = [];
    callTicketRef.current = null;
    toolRelayRef.current?.dispose();
    toolRelayRef.current = null;
    const uplinkRecorder = uplinkRecorderRef.current;
    uplinkRecorderRef.current = null;
    if (uplinkRecorder) {
      logger.runtime('[VoiceMode] uplink recording saved', {
        uri: saveUplinkRecording(uplinkRecorder) ?? 'failed',
      });
    }
    const gateCapture = gateCaptureRef.current;
    gateCaptureRef.current = null;
    if (gateCapture) {
      const engineState = engineRef.current?.snapshot();
      logger.runtime('[VoiceMode] gate capture saved', {
        uri:
          saveGateCapture(gateCapture, {
            deviceModel: Device.modelName,
            outputRoute: engineState?.outputRoute,
            voiceProcessingActive: engineState?.voiceProcessingActive,
            speakerFullDuplex: SPEAKER_FULL_DUPLEX,
          }) ?? 'failed',
      });
    }
    if (goodbyeRef.current) {
      clearInterval(goodbyeRef.current.timer);
      goodbyeRef.current = null;
    }
    void callNotificationRef.current?.stop();
    if (greetingTimerRef.current) {
      clearTimeout(greetingTimerRef.current);
      greetingTimerRef.current = null;
    }
    isGreetingActiveRef.current = false;
    if (selfInterruptTimerRef.current) {
      clearTimeout(selfInterruptTimerRef.current);
      selfInterruptTimerRef.current = null;
    }
    setupReadyRef.current?.reject(new Error('Voice session closed before setup completed.'));
    setupReadyRef.current = null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (thinkingTimerRef.current) {
      clearInterval(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
    thinkingRef.current.reset();
    micLevelRef.current.value = 0;
    if (isMountedRef.current) setIsThinking(false);
    if (debugTraceTimerRef.current) {
      clearInterval(debugTraceTimerRef.current);
      debugTraceTimerRef.current = null;
    }
    const finalDuration = recordingTimeRef.current;
    recordingTimeRef.current = 0;

    const engine = engineRef.current;
    engineRef.current = null;
    playbackMeterRef.current.reset();
    await engine?.stop().catch((error) => logger.handledError('Voice audio cleanup failed', error));
    const engineSnapshot = engine?.snapshot();
    if (engineSnapshot) logger.runtime('[VoiceMode] session metrics', engineSnapshot);
    const latency = latencyRef.current?.summary();
    latencyRef.current = null;
    if (latency) {
      logger.runtime('[VoiceMode] latency', latency);
      reportVoiceCall({
        latency,
        endedAt: Date.now(),
        platform: Platform.OS,
        model: liveModelRef.current,
        tokenPrefetched: tokenPrefetchedRef.current,
        warmStart: warmStartedRef.current,
        usage: usageRef.current,
        audioPolicy: {
          iosVoiceProcessing: VOICE_AUDIO_POLICY.iosVoiceProcessing,
          // Effective: the engine turns it off if iOS did not engage echo cancellation.
          speakerFullDuplex: engineSnapshot?.speakerFullDuplex ?? fullDuplexRef.current,
        },
        failure: failureRef.current ?? undefined,
        endedDuringStep: connectStepRef.current ?? undefined,
        turnDetection: turnDetectionRef.current,
        hybridEnd: HYBRID_END_MS
          ? { delayMs: HYBRID_END_MS, turnEnds: hybridTurnEndsRef.current }
          : undefined,
        toolCalls: transcriptDiagnosticsRef.current.toolCalls.length,
        selfInterruptions: selfInterruptRef.current
          ? {
              suspected: selfInterruptRef.current.suspected,
              fallbacks: selfInterruptRef.current.fallbacks,
            }
          : undefined,
        engine: engineSnapshot,
      });
    }
    failureRef.current = null;
    connectStepRef.current = null;

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
    transportsRef.current?.reset();
    session?.close();
    if (transcriptRef.current.hasActiveTranscript()) {
      transcriptRef.current.completeTurn();
    }
    const sessionTurns = transcriptRef.current.getSessionTurns();
    const flattenedSessionMessages = sessionTurns.flatMap((turn) => turn.messages);
    const callRecording = callRecordingRef.current;
    callRecordingRef.current = null;
    if (isMountedRef.current) setIsRecordingCall(false);
    const recording = callRecording?.stop(
      flattenedSessionMessages.map((message) => ({ role: message.role, text: message.text })),
    );
    const formattedDuration = formatVoiceCallDuration(finalDuration);
    const turnSync = turnSyncRef.current;
    turnSyncRef.current = null;
    if (recording) {
      const recordingUserId = useUserStore.getState().user?._id;
      // A conversation with nothing said is not worth a story.
      if (turnSync && recordingUserId && recording.segments.length > 0) {
        // Reassure the person their conversation is kept once it is safe.
        void finishCallRecording({ userId: recordingUserId, sessionId: turnSync.getSessionId(), recording })
          .then((result) => {
            toast(
              result === 'sent'
                ? 'Your conversation recording is saved to Stories'
                : 'Your conversation recording is saved and will appear in Stories shortly',
              'success',
            );
          })
          .catch((error) => {
            logger.handledError('Voice recording could not be saved', error);
            toast('We couldn’t save this conversation’s recording', 'error');
          });
      } else {
        discardCallRecording(recording.path);
      }
    }

    let callRecordText = '';
    let transcriptPersisted = false;

    if (turnSync) {
      syncCompletedTurnsInto(turnSync, transcriptRef.current);
      transcriptPersisted = await turnSync.flush();
      if (!transcriptPersisted) {
        await wait(1_000);
        transcriptPersisted = await turnSync.flush();
      }
      const savedMemoryId = turnSync.getMemoryId();
      if (savedMemoryId) {
        memoryIdRef.current = savedMemoryId;
        void queryClient.invalidateQueries({ queryKey: queryKeys.promptMessages(savedMemoryId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.memory(savedMemoryId) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.memories() });
      if (!transcriptPersisted) logger.handledError('Voice turns could not be saved after retry; kept on device');
      const outbox = outboxRef.current;
      outboxRef.current = null;
      if (outbox) {
        // The outbox sends any turns still unsaved, then the call end (which
        // saves the real duration and starts server-side clean-up), and keeps
        // both on the device until the server acknowledges them.
        void outbox
          .markEnded(turnSync.getSessionId(), finalDuration)
          .then(() => outbox.drain((url, body) => post(url, body)))
          .then((sent) => {
            if (sent && savedMemoryId) {
              void queryClient.invalidateQueries({
                queryKey: queryKeys.promptMessages(savedMemoryId),
              });
            }
          })
          .catch((error) => logger.handledError('Voice call end could not be recorded', error));
      } else if (transcriptPersisted) {
        // Saves the real duration and starts server-side transcript clean-up.
        void post(
          voiceCallEndPath(turnSync.getSessionId()),
          buildVoiceCallEndBody(finalDuration, savedMemoryId),
        ).catch((error) => logger.handledError('Voice call end could not be recorded', error));
      }
    } else {
      transcriptRef.current.drainCompleted();
      if (sessionTurns.length > 0) {
        callRecordText = serializeVoiceCallTranscript(formattedDuration, flattenedSessionMessages);
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
      transcriptPersisted = callRecordText
        ? await persistVoiceMessages([
            { role: 'ai', text: callRecordText, is_voice: true, duration: finalDuration },
          ])
        : false;
    }

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

    userTextSetterRef.current?.flush();
    aiTextSetterRef.current?.flush();
    publishTimelineRef.current();
    if (isMountedRef.current) {
      setIsConnected(false);
      setIsConnecting(false);
      setIsEnding(false);
      isAiSpeakingRef.current = false;
      setIsAiSpeaking(false);
    }
    isDisconnectingRef.current = false;
  }, [persistVoiceMessages]);

  const disconnectRef = useRef(disconnect);
  disconnectRef.current = disconnect;

  const openLiveSession = useCallback(
    async (
      liveToken: VoiceLiveToken,
      options: {
        activateNow: boolean;
        /**
         * A call prepared before the tap: its messages wait here until the
         * call starts and releases them (see voice-warm-start.ts).
         */
        buffer?: VoiceMessageBuffer<LiveServerMessage>;
        /** The session closed or failed by itself. */
        onClosed?: (session: Session) => void;
      },
    ): Promise<{ session: Session; transport: number }> => {
      const transports = transportsRef.current!;
      const transport = transports.begin();
      // A first connect owns the call at once. A reconnect only becomes the
      // active socket when it is swapped in.
      if (options.activateNow) transports.activate(transport);
      const setupReady = createSetupReady();
      // A prepared call has no call of its own yet: leave the current call's
      // state (and its latency tracker) alone.
      const prepared = Boolean(options.buffer);
      if (!prepared) setupReadyRef.current = setupReady;
      // Loaded on demand so the ~1MB SDK stays out of the startup bundle.
      // Contract: must resolve from '@google/genai/web' (see voice-provider-contract.test.ts).
      const { GoogleGenAI } = await import('@google/genai/web');
      if (!prepared) latencyRef.current?.mark('sdk');
      const client = new GoogleGenAI({
        apiKey: liveToken.token,
        httpOptions: { apiVersion: 'v1alpha' },
      });
      let session: Session | null = null;
      session = await client.live.connect({
        model: liveToken.model,
        callbacks: {
          onopen: () => {
            if (prepared) return;
            latencyRef.current?.mark('socketOpen');
            engineRef.current?.markConnectionOpen();
          },
          onmessage: (message: LiveServerMessage) => {
            // Setup completion belongs to this socket, active or not.
            const raw = message as LiveServerMessage & { setup_complete?: unknown };
            if (raw.setupComplete || raw.setup_complete) setupReady.resolve();
            if (options.buffer) {
              options.buffer.push(message);
              return;
            }
            // Only the active socket may change call state: a replacement
            // still setting up, or an old socket after a swap, may not.
            if (!transports.isActive(transport)) return;
            handleLiveMessage(message);
          },
          onerror: (error) => {
            logger.debug('Live voice session failed', error);
            setupReady.reject(new Error('Voice session failed during setup.'));
            if (session) options.onClosed?.(session);
            void connectionLostRef.current(session, true);
          },
          onclose: (event) => {
            setupReady.reject(new Error('Voice session closed during setup.'));
            if (session) options.onClosed?.(session);
            void connectionLostRef.current(session, false, describeSocketClose(event));
          },
        },
        // The token locks the real config server-side. This only satisfies the SDK.
        config: buildGeminiLiveConfig(liveToken.voiceName, useVoicePreferenceStore.getState().languageCode),
      });
      try {
        await withDeadline(
          setupReady.promise,
          VOICE_SETUP_TIMEOUT_MS,
          'Voice session setup timed out.',
        );
      } catch (error) {
        // Don't leave a socket open behind a session that never became usable.
        session.close();
        throw error;
      }
      return { session, transport };
    },
    [handleLiveMessage],
  );

  const reconnect = useCallback(
    async (reason: ReconnectReason): Promise<ReconnectResult> => {
      if (reconnectingRef.current) return 'in-progress';
      if (!resumeHandleRef.current || !isSessionActiveRef.current) return 'unavailable';
      reconnectingRef.current = true;
      if (isMountedRef.current) setIsReconnecting(true);
      const previous = sessionRef.current;
      const startedAt = Date.now();
      logger.runtime('[VoiceMode] reconnecting', { reason });
      try {
        for (let attempt = 0; ; attempt += 1) {
          // Bounded by elapsed time, not just the schedule: each attempt can
          // spend a token request and a setup wait.
          const delay = nextReconnectDelay(attempt, Date.now() - startedAt);
          if (delay === null) return 'failed';
          await wait(delay);
          if (!isSessionActiveRef.current) return 'ended';
          try {
            const tokenResponse = await get<unknown>(
              buildEphemeralTokenUrl(endpoint.ephemeralToken, {
                resumeHandle: resumeHandleRef.current,
                callTicket: callTicketRef.current,
                memoryId: memoryIdRef.current,
                deviceModel: Device.modelName,
                capabilities: CLIENT_CAPABILITIES,
              }),
              { timeout: VOICE_TOKEN_TIMEOUT_MS, headers: currentDigitalMindHeaders() },
            );
            const liveToken = parseVoiceLiveToken(
              tokenResponse.data,
              voiceName ?? 'Fenrir',
            );
            const { session: next, transport } = await openLiveSession(liveToken, {
              activateNow: false,
            });
            if (!isSessionActiveRef.current) {
              next.close();
              return 'ended';
            }
            sessionRef.current = next;
            transportsRef.current?.activate(transport);
            previous?.close();
            // The server's count is the clock: restart the timers from it.
            scheduleCallLimitRef.current(liveToken.callTime);
            // An abandoned response's end marker may never arrive on the
            // resumed session; keeping the gate shut could swallow a reply.
            responseGateRef.current?.reset();
            logger.runtime('[VoiceMode] reconnected', { reason, attempt });
            return 'reconnected';
          } catch (error) {
            if (isCallTimeUp(error)) {
              // Retrying cannot help: the call's time is up.
              failureRef.current ??= { step: 'connection-lost', message: 'Call time limit reached' };
              return 'failed';
            }
            if (getVoiceConnectionFailure(error).kind === 'upgrade-required') {
              // The free plan's voice minutes for the month ran out mid-call.
              failureRef.current ??= { step: 'connection-lost', message: 'Free voice minutes used up' };
              return 'failed';
            }
            logger.handledError('Voice reconnect attempt failed', error);
          }
        }
      } finally {
        reconnectingRef.current = false;
        if (isMountedRef.current) setIsReconnecting(false);
      }
    },
    [openLiveSession, voiceName],
  );
  reconnectRef.current = reconnect;

  const handleConnectionLost = useCallback(
    async (closed: Session | null, isError: boolean, close?: SocketClose): Promise<void> => {
      // Ignore the old socket closing after a successful swap.
      if (closed !== sessionRef.current) return;
      if (!isSessionActiveRef.current || isDisconnectingRef.current) return;
      if (reconnectingRef.current) return;
      if (resumeHandleRef.current) {
        const result = await reconnect('connection-lost');
        if (result === 'reconnected' || result === 'in-progress' || result === 'ended') return;
      }
      // Gemini closed the socket on us. Keep its code and reason for Sentry.
      const unexpected = isError || (close?.code !== undefined && close.code !== 1000);
      if (unexpected) {
        failureRef.current ??= {
          step: 'connection-lost',
          message: isError
            ? 'Socket error'
            : `Socket closed ${close?.code}${close?.reason ? `: ${close.reason}` : ''}`,
        };
      }
      if (unexpected && isMountedRef.current) {
        setConnectionFailure({
          kind: 'connection-error',
          message: 'Voice session was disconnected. Tap to reconnect.',
        });
      }
      await disconnectRef.current();
    },
    [reconnect],
  );
  connectionLostRef.current = handleConnectionLost;

  // A go-away or network change whose reconnect ran out of time leaves a call
  // that looks connected but can't talk. End it and say so.
  const endCallIfReconnectFailedRef = useRef(
    (result: ReconnectResult, reason: ReconnectReason) => {
      if (result !== 'failed' || !isSessionActiveRef.current) return;
      failureRef.current ??= { step: 'reconnect', message: `Reconnect failed after ${reason}` };
      if (isMountedRef.current) {
        setConnectionFailure({
          kind: 'connection-error',
          message: 'Voice session was disconnected. Tap to reconnect.',
        });
      }
      void disconnectRef.current();
    },
  );

  const setMuted = useCallback((muted: boolean) => {
    const wasMuted = isMutedRef.current;
    isMutedRef.current = muted;
    setIsMuted(muted);
    // Tell Gemini the mic is paused, so speech cut off by the mute is
    // finalized rather than left waiting. Sending audio again on unmute
    // reopens the stream.
    if (muted && !wasMuted) {
      try {
        sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
      } catch (error) {
        logger.handledError('Could not signal the paused microphone', error);
      }
    }
  }, []);

  /** Hang up once the model's goodbye has played (at most 6 s), then run `then`. */
  const endCallAfterGoodbye = useCallback((then?: () => void) => {
    if (goodbyeRef.current || !isSessionActiveRef.current) return;
    const timer = setInterval(() => {
      const pending = goodbyeRef.current;
      if (!pending) return;
      const playing = engineRef.current?.isAudible(150) ?? false;
      if (!pending.tracker.shouldHangUp(Date.now(), playing)) return;
      clearInterval(pending.timer);
      goodbyeRef.current = null;
      void disconnectRef.current().then(() => {
        if (pending.then) pending.then();
        else callActionsRef.current?.onModelEndedCall();
      });
    }, 100);
    goodbyeRef.current = { tracker: new GoodbyeTracker(Date.now()), timer, then };
  }, []);

  /**
   * Arms the call's time limit, when the server sets one: a spoken heads-up
   * near the end, then a goodbye after which the call ends. Called again on
   * each reconnect with the server's fresh count.
   */
  const scheduleCallLimit = useCallback((callTime: VoiceCallTime | undefined) => {
    callLimitTimersRef.current.forEach(clearTimeout);
    callLimitTimersRef.current = [];
    if (!callTime) return;
    callTicketRef.current = callTime.ticket;
    const ask = (text: string) => {
      try {
        sessionRef.current?.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true });
      } catch (error) {
        logger.handledError('Voice call time notice failed', error);
      }
    };
    const prompts = callLimitPrompts(callTime.reason);
    const { warnInMs, endInMs } = callLimitSchedule(callTime.secondsLeft);
    if (warnInMs !== null) {
      callLimitTimersRef.current.push(setTimeout(() => ask(prompts.endingSoon), warnInMs));
    }
    callLimitTimersRef.current.push(
      setTimeout(() => {
        if (!isSessionActiveRef.current) return;
        ask(prompts.timeUp);
        endCallAfterGoodbye();
      }, endInMs),
    );
  }, [endCallAfterGoodbye]);
  const scheduleCallLimitRef = useRef(scheduleCallLimit);
  scheduleCallLimitRef.current = scheduleCallLimit;

  /**
   * Prepares a call before the tap: opens the Gemini session with the
   * prefetched token and asks for the greeting, holding everything Gemini
   * sends until connect() starts the call. The microphone stays off.
   */
  const warmUp = useCallback(
    (key: string, id: string | undefined, name: string | undefined) => {
      const token = tokenPrefetchRef.current?.take(key);
      if (!token) return;
      let session: Session | undefined;
      // Identifies this warm-up: a newer one, or leaving the screen, replaces it.
      const entry = { key, ready: Promise.resolve(), claimed: false };
      warmingRef.current = entry;
      const began = Date.now();
      logger.runtime('[VoiceMode] preparing the call');
      // Cancelled when replaced, or when a call starts without waiting for it.
      const cancelled = () => !entry.claimed && (warmingRef.current !== entry || engineRef.current !== null);
      entry.ready = (async () => {
        try {
          const response = (await token) as Awaited<ReturnType<typeof fetchVoiceToken>>;
          if (cancelled()) return;
          const liveToken = parseVoiceLiveToken(response.data, name ?? 'Fenrir');
          const buffer = new VoiceMessageBuffer<LiveServerMessage>();
          const opened = await openLiveSession(liveToken, {
            activateNow: false,
            buffer,
            onClosed: (closed) => warmStartRef.current?.markClosed(closed),
          });
          session = opened.session;
          if (cancelled()) {
            session.close();
            return;
          }
          session.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: greetingPromptFor(liveToken) }] }],
            turnComplete: true,
          });
          const call: WarmCall<Session, VoiceLiveToken, LiveServerMessage> = {
            key,
            startedAt: Date.now(),
            session,
            transport: opened.transport,
            liveToken,
            buffer,
          };
          warmStartRef.current?.hold(call);
          logger.runtime('[VoiceMode] call prepared before the tap', {
            tookMs: Date.now() - began,
          });
          if (entry.claimed) return;
          // Replace it before it goes stale, a few times per visit.
          const refresh = warmRefreshRef.current;
          if (refresh.timer) clearTimeout(refresh.timer);
          refresh.timer = setTimeout(() => {
            refresh.timer = null;
            if (refresh.left <= 0 || engineRef.current) return;
            if (!warmStartRef.current?.isHeldFor(key)) return;
            refresh.left -= 1;
            tokenPrefetchRef.current?.prefetch(key, () => fetchVoiceToken(id));
            warmUpRef.current(key, id, name);
          }, VOICE_WARM_START_MAX_AGE_MS - 15_000);
        } catch (error) {
          session?.close();
          logger.runtime('[VoiceMode] could not prepare the call; it will start normally', {
            message: describeVoiceError(error).message,
          });
        } finally {
          if (warmingRef.current === entry) warmingRef.current = null;
        }
      })();
    },
    [openLiveSession],
  );
  const warmUpRef = useRef(warmUp);
  warmUpRef.current = warmUp;

  /**
   * Fetches the session token and loads the Gemini SDK before the user taps
   * call, and prepares the call itself (see warmUp). connect() uses them
   * when they were made for the same conversation and voice.
   */
  const prefetch = useCallback(
    (target: { memoryId?: string | null; voiceName?: string } = {}) => {
      if (engineRef.current) return;
      const id = validMemoryId(target.memoryId ?? memoryId);
      const name = target.voiceName ?? voiceName;
      const key = voiceTokenKey(id, name);
      tokenPrefetchRef.current?.prefetch(key, () => fetchVoiceToken(id));
      import('@google/genai/web').catch(() => {});
      if (!VOICE_WARM_START) return;
      if (warmStartRef.current?.isHeldFor(key) || warmingRef.current?.key === key) return;
      warmUp(key, id, name);
    },
    [memoryId, voiceName, warmUp],
  );

  /** Leaving the call screen: close any prepared call. */
  const cancelPrefetch = useCallback(() => {
    if (warmingRef.current?.claimed) return;
    warmingRef.current = null;
    warmStartRef.current?.discard();
    const refresh = warmRefreshRef.current;
    if (refresh.timer) clearTimeout(refresh.timer);
    refresh.timer = null;
    refresh.left = VOICE_WARM_START_REFRESHES;
  }, []);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected || isDisconnectingRef.current) return;
    // A call prepared on the call screen for this conversation and voice
    // (or still being prepared). Claimed now, before anything awaits, so
    // leaving the screen cannot close it from under this call.
    const warmKey = voiceTokenKey(validMemoryId(memoryId), voiceName);
    const warming = warmingRef.current?.key === warmKey ? warmingRef.current : undefined;
    if (warming) warming.claimed = true;
    else warmingRef.current = null;
    const warmReady =
      VOICE_WARM_START && (warming || warmStartRef.current?.isHeldFor(warmKey))
        ? (warming?.ready ?? Promise.resolve()).then(() => warmStartRef.current?.take(warmKey))
        : undefined;
    if (!warmReady) warmStartRef.current?.discard();
    if (warmRefreshRef.current.timer) clearTimeout(warmRefreshRef.current.timer);
    warmRefreshRef.current.timer = null;
    setIsConnecting(true);
    isSessionActiveRef.current = true;
    hasCompletedSessionRef.current = false;
    isMutedRef.current = false;
    isGreetingActiveRef.current = !SPEAKER_FULL_DUPLEX;
    isAiSpeakingRef.current = false;
    resumeHandleRef.current = null;
    // The call outlives the call screen, so start each call from the current
    // prop rather than the conversation a previous call used.
    memoryIdRef.current = validMemoryId(memoryId);
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
    userTextSetterRef.current?.cancel();
    aiTextSetterRef.current?.cancel();
    setAiSpeechText('Connecting secure voice link...');
    setUserSpeechText('');
    setConnectionFailure(null);
    transcriptRef.current = new VoiceTranscriptTurns();
    transcriptDiagnosticsRef.current = createVoiceTranscriptDiagnostics();
    sessionIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    timelineRef.current = { id: sessionIdRef.current, memoryId: resolveTargetMemoryId(), startedAt: new Date().toISOString() };
    timelineTimesRef.current.clear();
    timelineConnectedRef.current = false;
    setVoiceTimeline(null);
    messageHandlerRef.current = new VoiceMessageHandler();
    uplinkRecorderRef.current = DEBUG_RECORD_UPLINK ? new VoiceUplinkRecorder() : null;
    hybridEndRef.current = new VoiceHybridEnd(HYBRID_END_MS);
    hybridTurnEndsRef.current = 0;
    gateCaptureRef.current = DEBUG_CAPTURE_GATE ? new VoiceGateCapture() : null;
    latencyRef.current = new VoiceLatencyTracker();
    // On a loud speaker, leftover echo can still get past the echo filter and
    // Memento keeps interrupting itself. When it does, stop listening while
    // Memento talks for a while (the Interrupt button still works), then try
    // again; each repeat lasts longer.
    const guard = new VoiceSelfInterruptGuard({
      now: Date.now,
      onFallback: (durationMs) => {
        // The echo that made Memento hear itself; listening resumes once the
        // echo has clearly dropped (the volume went down), not on a timer.
        const echoAtFallback = engineRef.current?.leftoverEchoLevel() ?? 0;
        fullDuplexRef.current = false;
        engineRef.current?.setSpeakerFullDuplex(false);
        logger.runtime('[VoiceMode] Memento is hearing itself on the speaker; pausing the mic while it talks', {
          durationMs,
          echo: Math.round(echoAtFallback * 1_000) / 1_000,
        });
        const check = (afterMs: number) => {
          if (selfInterruptTimerRef.current) clearTimeout(selfInterruptTimerRef.current);
          selfInterruptTimerRef.current = setTimeout(() => {
            selfInterruptTimerRef.current = null;
            const engine = engineRef.current;
            if (selfInterruptRef.current !== guard || !engine) return;
            const echoNow = engine.leftoverEchoLevel();
            if (!shouldRestore(echoAtFallback, echoNow, engine.fallbackEchoMeasuredSeconds())) {
              check(VOICE_FALLBACK_RECHECK_MS);
              return;
            }
            guard.restore();
            fullDuplexRef.current = allowedFullDuplexRef.current;
            engine.setSpeakerFullDuplex(allowedFullDuplexRef.current);
            logger.runtime('[VoiceMode] the echo dropped; listening while Memento talks again', {
              echo: Math.round(echoNow * 1_000) / 1_000,
            });
          }, afterMs);
        };
        check(durationMs);
      },
    });
    selfInterruptRef.current = guard;
    liveModelRef.current = undefined;
    turnDetectionRef.current = undefined;
    tokenPrefetchedRef.current = false;
    warmStartedRef.current = false;
    failureRef.current = null;
    usageRef.current = {};
    responseGateRef.current?.reset();
    transportsRef.current?.reset();
    const setStep = (next: string) => {
      if (attempt === connectAttemptRef.current) connectStepRef.current = next;
    };
    const attempt = ++connectAttemptRef.current;
    connectStepRef.current = 'permission';
    // The user can hang up while any step below is still awaiting.
    const callEnded = () =>
      attempt !== connectAttemptRef.current || !isSessionActiveRef.current;

    const engine = new VoiceAudioEngine({
      speakerFullDuplex: SPEAKER_FULL_DUPLEX,
      iosVoiceProcessing: VOICE_AUDIO_POLICY.iosVoiceProcessing,
      onMicFrame: (samples, flags) => {
        if (DEBUG_CAPTURE_GATE) gateCaptureRef.current?.add(samples, flags);
        // Everything the mic hears goes to the recording, except while muted.
        callRecordingRef.current?.pushMic(samples, isMutedRef.current, flags.audibleOnSpeaker);
      },
      onFatalError: (error) => {
        logger.handledError('Native voice audio failed', error);
        failureRef.current ??= { step: 'audio', message: error.message };
        if (isMountedRef.current) {
          setConnectionFailure({
            kind: 'connection-error',
            message: 'Voice audio was interrupted. Tap to reconnect.',
          });
        }
        void disconnectRef.current();
      },
      onPlaybackStateChange: (state) => {
        if (state === 'playing') latencyRef.current?.observePlaybackStart();
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
    playbackMeterRef.current.reset();


    try {
      const permission = await engine.requestRecordingPermission();
      if (!isPermissionGranted(permission)) {
        engineRef.current = null;
        latencyRef.current = null;
        connectStepRef.current = null;
        setIsConnecting(false);
        showPermissionRecoveryAlert({
          permission,
          title: 'Microphone access needed',
          description: 'Memento needs microphone access to start voice mode.',
          settingsDescription: 'Enable microphone permissions in Settings to talk with Memento.',
        });
        return;
      }
      if (callEnded()) return;
      latencyRef.current?.mark('permission');

      // Token, Gemini connection and audio start run in parallel.
      const tokenMemoryId = memoryIdRef.current;
      const requestToken = () => {
        const prefetched = tokenPrefetchRef.current?.take(voiceTokenKey(tokenMemoryId, voiceName));
        tokenPrefetchedRef.current = Boolean(prefetched);
        return prefetched
          ? prefetched.catch(() => {
              tokenPrefetchedRef.current = false;
              return fetchVoiceToken(tokenMemoryId);
            })
          : fetchVoiceToken(tokenMemoryId);
      };
      // Without a prepared call, the token request starts now as before.
      const tokenRequest = warmReady ? undefined : requestToken();

      latencyRef.current?.beginAudioStart();
      const audioReady = engine.start((data, rms) => {
        if (__DEV__) debugMicPeakRef.current = Math.max(debugMicPeakRef.current, rms);
        // Frames captured before the Gemini session exists have nowhere to go.
        if (!sessionRef.current) return;
        const diagnostics = transcriptDiagnosticsRef.current;
        if (isMutedRef.current) {
          diagnostics.micFramesDroppedMuted += 1;
          return;
        }
        if (isGreetingActiveRef.current) {
          diagnostics.micFramesDroppedGreeting += 1;
          return;
        }
        // With no network the socket can't send, and the platform would queue
        // every frame in memory until it reconnects. Drop them instead; the
        // reconnect resumes the conversation.
        if (lastNetworkRef.current?.isConnected === false) {
          diagnostics.micFramesDroppedOffline += 1;
          return;
        }
        diagnostics.micFramesSent += 1;
        latencyRef.current?.observeMicFrame(rms);
        thinkingRef.current.observeMic(rms);
        micLevelRef.current.value = rms;
        uplinkRecorderRef.current?.add(data);
        try {
          sessionRef.current?.sendRealtimeInput({
            audio: { data, mimeType: 'audio/pcm;rate=16000' },
          });
          const quietMs = thinkingRef.current.quietForMs();
          if (hybridEndRef.current.check(quietMs, isAiSpeakingRef.current)) {
            hybridTurnEndsRef.current += 1;
            logger.runtime('[VoiceMode] hybrid end of turn', { quietMs });
            sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
          }
        } catch {
          // Socket is closing during a reconnect. Drop this frame.
        }
      });
      // Awaited below. An audio failure also reaches onFatalError, which hangs up.
      audioReady.then(
        () => latencyRef.current?.endAudioStart(),
        () => {},
      );

      setStep('token');
      const waitStartedAt = Date.now();
      const warm = warmReady ? await warmReady.catch(() => undefined) : undefined;
      const waitedForWarmMs = Date.now() - waitStartedAt;
      if (callEnded()) {
        warm?.session.close();
        return;
      }
      warmStartedRef.current = Boolean(warm);
      let liveToken: VoiceLiveToken;
      if (warm) {
        liveToken = warm.liveToken;
      } else {
        const tokenResponse = (await (tokenRequest ?? requestToken())) as Awaited<
          ReturnType<typeof fetchVoiceToken>
        >;
        if (callEnded()) return;
        liveToken = parseVoiceLiveToken(tokenResponse.data, voiceName ?? 'Fenrir');
      }
      latencyRef.current?.mark('token');
      liveModelRef.current = liveToken.model;
      turnDetectionRef.current = liveToken.turnDetection;

      if (liveToken.memoryId) memoryIdRef.current = liveToken.memoryId;
      // The server can switch specific device models back to the speaker mic gate.
      const fullDuplex = SPEAKER_FULL_DUPLEX && liveToken.speakerFullDuplex !== false;
      fullDuplexRef.current = fullDuplex;
      allowedFullDuplexRef.current = fullDuplex;
      engine.setSpeakerFullDuplex(fullDuplex);
      isGreetingActiveRef.current = !fullDuplex;
      const sessionTools = liveToken.tools ?? [];
      const callActionsEnabled = CALL_ACTION_TOOLS.some((tool) => sessionTools.includes(tool));
      // Profile changes, opening a story, and whatever the API adds: run on
      // the server, with effects applied here.
      const serverToolHandlers = createServerToolHandlers(liveToken.serverTools, {
        // Gemini's call id lets the API run a repeated call once; the
        // session id keeps "undo" within this call.
        run: (name, args, invocation) =>
          post(
            endpoint.voiceTool(name),
            { args, call_id: invocation.callId, session_id: sessionIdRef.current },
            { timeout: VOICE_SERVER_TOOL_TIMEOUT_MS },
          ),
        applyEffects: (effects) => {
          for (const effect of effects) {
            if (effect.type === 'refresh') {
              if (effect.what === 'profile') {
                void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
              } else if (effect.what === 'memories') {
                invalidateMemoryQueries(queryClient, { includeUserStats: true, includeAllStories: true });
              } else if (effect.what === 'capsules') {
                void queryClient.invalidateQueries({ queryKey: ['capsules'] });
                void queryClient.invalidateQueries({ queryKey: queryKeys.capsuleStats });
              } else if (effect.what === 'beneficiaries') {
                void queryClient.invalidateQueries({ queryKey: queryKeys.beneficiaries });
              } else if (effect.what === 'observations') {
                // What Memento keeps about the host: the persona (and its summary) and their context.
                void queryClient.invalidateQueries({ queryKey: queryKeys.persona });
                void queryClient.invalidateQueries({ queryKey: queryKeys.userContext });
              }
            } else if (effect.type === 'open') {
              const destination = resolveVoiceDestination(effect.destination);
              if (destination) callActionsRef.current?.navigate(destination.href);
            } else if (effect.type === 'open_story') {
              callActionsRef.current?.navigate(`/(tabs)/stories/${effect.id}`);
            }
          }
        },
      });
      const screenControlEnabled = SCREEN_CONTROL_TOOLS.some((tool) => sessionTools.includes(tool));
      toolRelayRef.current =
        sessionTools.includes(SEARCH_MEMORIES_TOOL) ||
        callActionsEnabled ||
        screenControlEnabled ||
        liveToken.serverTools.length > 0
          ? new VoiceToolRelay(
              async (query) => {
                const response = await post(
                  endpoint.voiceMemorySearch,
                  { query },
                  { timeout: VOICE_MEMORY_SEARCH_TIMEOUT_MS },
                );
                return (response as { data?: { result?: string } })?.data?.result ?? '';
              },
              (functionResponses) => {
                try {
                  sessionRef.current?.sendToolResponse({ functionResponses });
                } catch (error) {
                  logger.handledError('Failed to send voice tool response', error);
                }
              },
              {
                ...serverToolHandlers,
                ...(screenControlEnabled
                  ? createScreenControlHandlers({
                      registry: voiceControl,
                      canGoBack: () => expoRouter.canGoBack(),
                      goBack: () => expoRouter.back(),
                    })
                  : {}),
                ...(callActionsEnabled
                  ? createCallActionHandlers({
                      endAfterGoodbye: endCallAfterGoodbye,
                      setMuted,
                      navigate: (href) => callActionsRef.current?.navigate(href),
                    })
                  : {}),
              },
            )
          : null;
      const outboxUserId = useUserStore.getState().user?._id;
      const outbox =
        liveToken.supportsVoiceTurns && outboxUserId ? getVoiceCallOutbox(outboxUserId) : null;
      outboxRef.current = outbox;
      const callSessionId = sessionIdRef.current;
      // Record the conversation when it will be saved on the server (turn-synced calls).
      const recorderNative = liveToken.supportsVoiceTurns && useVoicePreferenceStore.getState().recordConversations
        ? getCallRecorderNative()
        : null;
      if (recorderNative && !callRecordingRef.current) {
        const recording = new CallRecordingSession(recorderNative);
        if (recording.start(newCallRecordingPath(callSessionId))) {
          callRecordingRef.current = recording;
          if (isMountedRef.current) setIsRecordingCall(true);
        }
      }
      turnSyncRef.current = liveToken.supportsVoiceTurns
        ? new VoiceTurnSync(
            (url, body) => post(url, body),
            endpoint.voiceTurns,
            callSessionId,
            resolveTargetMemoryId(),
            // Mirror unsaved turns to the device, so they survive the app
            // being killed or the network dropping at hang-up.
            (pending, savedMemoryId) => {
              outbox?.saveTurns(callSessionId, savedMemoryId, pending).catch((error) =>
                logger.handledError('Voice outbox write failed', error),
              );
            },
          )
        : null;

      setStep('session');
      let session: Session;
      if (warm) {
        // Open and set up before the tap; its messages are still held.
        session = warm.session;
        transportsRef.current?.activate(warm.transport);
        latencyRef.current?.mark('sdk');
        latencyRef.current?.mark('socketOpen');
      } else {
        ({ session } = await openLiveSession(liveToken, { activateNow: true }));
      }
      if (callEnded()) {
        session.close();
        return;
      }
      sessionRef.current = session;

      setStep('audio');
      await audioReady;
      if (callEnded()) return;
      // Only shield the greeting from the loudspeaker's echo. On earphones the
      // user may talk over it.
      isGreetingActiveRef.current = !fullDuplexRef.current && !engine.isHeadphonesActive();
      setStep('greeting');
      engine.armGreetingShield();
      if (warm) {
        // The greeting was asked for before the tap. Hand everything the
        // prepared session received (setup, greeting audio and text) to the
        // call, in order, as if it had just arrived; then go live.
        engine.markConnectionOpen();
        latencyRef.current?.mark('setupComplete');
        latencyRef.current?.mark('greetingSent');
        const transport = warm.transport;
        const replayed = warm.buffer.release((message) => {
          if (transportsRef.current?.isActive(transport)) handleLiveMessage(message);
        });
        logger.runtime('[VoiceMode] started from the prepared call', {
          replayed,
          // Waited for preparation to finish, and how long it was ready before the tap.
          waitedMs: waitedForWarmMs,
          readyForMs: Math.max(0, waitStartedAt - warm.startedAt),
        });
      } else {
        session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: greetingPromptFor(liveToken) }] }],
          turnComplete: true,
        });
        latencyRef.current?.mark('greetingSent');
      }

      // The call is up: arm its time limit, if the server set one.
      scheduleCallLimitRef.current(liveToken.callTime);

      // Safety guard: The greeting shield prevents the model's initial spoken greeting
      // from leaking into the microphone and causing self-interruption.
      // It automatically disarms after 4.5 seconds if playback state has not already disarmed it.
      if (isGreetingActiveRef.current) {
        if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
        greetingTimerRef.current = setTimeout(() => {
          isGreetingActiveRef.current = false;
          engineRef.current?.disarmGreetingShield();
        }, 4500);
      }

      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime((time) => time + 1);
      }, 1_000);
      thinkingRef.current.reset();
      let wasThinking = false;
      thinkingTimerRef.current = setInterval(() => {
        if (!isMountedRef.current) return;
        const thinking = thinkingRef.current.isThinking(isAiSpeakingRef.current);
        if (thinking === wasThinking) return;
        wasThinking = thinking;
        if (__DEV__) logger.runtime('[VoiceMode] thinking', { on: thinking });
        setIsThinking(thinking);
      }, 150);
      if (__DEV__) {
        // Logs whenever playback or filter state changes, and a heartbeat
        // every 2 s with the loudest mic frame sent since the last line.
        let last = '';
        let ticks = 0;
        debugTraceTimerRef.current = setInterval(() => {
          const state = engineRef.current?.debugState();
          if (!state) return;
          const { echoLevel, bargeIns, suppressed, ...flags } = state;
          const key = JSON.stringify(flags);
          ticks += 1;
          if (key === last && ticks % 8 !== 0) return;
          last = key;
          logger.debug('[VoiceTrace]', {
            t: recordingTimeRef.current,
            ...flags,
            echoLevel,
            micPeak: Math.round(debugMicPeakRef.current * 1_000) / 1_000,
            bargeIns,
            suppressed,
            buttonsOnScreen: voiceControl.activeButtons().length,
            unlabelledTaps: voiceControl.unlabelledOnScreen(),
          });
          debugMicPeakRef.current = 0;
        }, 250);
      }
      void callNotificationRef.current?.start(() => {
        void disconnectRef.current();
      });
      networkUnsubscribeRef.current?.();
      lastNetworkRef.current = undefined;
      networkUnsubscribeRef.current = NetInfo.addEventListener((state) => {
        const next = { type: String(state.type), isConnected: state.isConnected };
        if (shouldReconnectOnNetworkChange(lastNetworkRef.current, next)) {
          void reconnectRef.current('network-change').then((result) =>
            endCallIfReconnectFailedRef.current(result, 'network-change'),
          );
        }
        lastNetworkRef.current = next;
      });
      connectStepRef.current = null;
      if (isMountedRef.current) {
        setIsConnected(true);
        timelineConnectedRef.current = true;
        publishTimelineRef.current();
        setIsConnecting(false);
      }
    } catch (error) {
      // Hanging up mid-connect is not a failure to report.
      if (callEnded()) return;
      failureRef.current ??= {
        step: connectStepRef.current ?? 'connect',
        ...describeVoiceError(error),
      };
      const failure = getVoiceConnectionFailure(error);
      if (failure.kind === 'connection-error') {
        logger.debug('Failed to connect voice session', error);
      }
      if (isMountedRef.current) setConnectionFailure(failure);
      await disconnect();
    }
  }, [
    disconnect,
    endCallAfterGoodbye,
    handleLiveMessage,
    isConnected,
    isConnecting,
    memoryId,
    openLiveSession,
    resolveTargetMemoryId,
    setMuted,
    voiceName,
  ]);

  const toggleMute = useCallback(() => {
    void Haptics.selectionAsync();
    isMutedRef.current = !isMutedRef.current;
    setIsMuted(isMutedRef.current);
  }, []);

  const interrupt = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const engine = engineRef.current;
    if (!engine) return;
    // Gemini has no cancel message: keep the rest of this response from
    // playing once it arrives (see VoiceResponseGate).
    responseGateRef.current?.interruptLocally();
    latencyRef.current?.observeModelTurnEnd({ interruptedBy: 'tap' });
    thinkingRef.current.reset();
    const newEpoch = engine.nextEpoch();
    engine.interruptOutput(newEpoch);
    if (greetingTimerRef.current) {
      clearTimeout(greetingTimerRef.current);
      greetingTimerRef.current = null;
    }
    isGreetingActiveRef.current = false;
    engine.disarmGreetingShield();
    isAiSpeakingRef.current = false;
    // Same transcript path as a server interruption: the turn is saved as
    // interrupted, and a pending turn completion no longer applies.
    pendingTurnCompleteRef.current = false;
    if (pendingTurnCompleteTimerRef.current) {
      clearTimeout(pendingTurnCompleteTimerRef.current);
      pendingTurnCompleteTimerRef.current = null;
    }
    transcriptRef.current.handleInterruption();
    transcriptRef.current.completeTurn();
    syncCompletedTurns(true);
    outputTranscriptFinishedRef.current = false;
    if (isMountedRef.current) {
      setIsAiSpeaking(false);
    }
  }, [syncCompletedTurns]);


  // The greeting already includes the language. Only send an update when it changes mid-call.
  const appliedLanguageRef = useRef(languageCode);
  useEffect(() => {
    if (!isConnected) { appliedLanguageRef.current = languageCode; return; }
    if (!sessionRef.current || appliedLanguageRef.current === languageCode) return;
    try {
      sessionRef.current.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: voiceLanguageInstruction(languageCode) }] }],
        turnComplete: true,
      });
      appliedLanguageRef.current = languageCode;
    } catch (error) {
      logger.handledError('Could not update the active voice language', error);
    }
  }, [isConnected, languageCode]);

  const sendText = useCallback((text: string) => {
    sendVoiceText(text, {
      ready: isConnected && !isReconnecting && !isEnding,
      session: sessionRef.current,
      record: (value) => {
        // Keep typed messages separate from any speech already in flight.
        transcriptRef.current.completeTurn();
        transcriptRef.current.appendUser(value);
        transcriptRef.current.completeTurn();
        syncCompletedTurns();
        publishTimelineRef.current();
      },
    });
  }, [isConnected, isReconnecting, isEnding, syncCompletedTurns]);

  // Sends what earlier calls left on the device (network down at hang-up, app
  // killed mid-call): at launch, when an account signs in, and whenever the
  // network comes back. The call in progress is never touched.
  const signedInUserId = useUserStore((state) => state.user?._id);
  useEffect(() => {
    if (!signedInUserId) return;
    const outbox = getVoiceCallOutbox(signedInUserId);
    const drain = () => {
      outbox
        .drain((url, body) => post(url, body), {
          skipSessionId: isSessionActiveRef.current ? sessionIdRef.current : undefined,
        })
        .catch((error) => logger.handledError('Voice outbox drain failed', error));
      if (!isSessionActiveRef.current) {
        drainCallRecordings(signedInUserId)
          .catch((error) => logger.handledError('Voice recording outbox drain failed', error));
      }
    };
    drain();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) drain();
    });
    return unsubscribe;
  }, [signedInUserId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      userTextSetterRef.current?.cancel();
      aiTextSetterRef.current?.cancel();
      void disconnectRef.current();
    };
  }, []);

  return useMemo(
    () => ({
      isConnected,
      voiceTimeline,
      isConnecting,
      isEnding,
      isReconnecting,
      isMuted,
      isRecordingCall,
      recordingTime,
      aiSpeechText,
      userSpeechText,
      isAiSpeaking,
      getPlaybackLevel,
      isThinking,
      micLevel: micLevelRef.current,
      connectionFailure,
      connect,
      prefetch,
      cancelPrefetch,
      disconnect,
      toggleMute,
      setMuted,
      endCallAfterGoodbye,
      sendText,
      interrupt,
    }),
    [
      isConnected,
      voiceTimeline,
      isConnecting,
      isEnding,
      isReconnecting,
      isMuted,
      isRecordingCall,
      recordingTime,
      aiSpeechText,
      userSpeechText,
      isAiSpeaking,
      getPlaybackLevel,
      isThinking,
      connectionFailure,
      connect,
      prefetch,
      cancelPrefetch,
      disconnect,
      toggleMute,
      setMuted,
      endCallAfterGoodbye,
      sendText,
      interrupt,
    ],
  );
}
