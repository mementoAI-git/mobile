// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('Gemini voice provider contract', () => {
  test('uses the browser Gemini implementation required by React Native', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(source).toContain("from '@google/genai/web'");
    expect(source).not.toContain("from '@google/genai';");
  });

  test('delegates full-duplex capture and playback to the native engine', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(source).toContain('VoiceAudioEngine');
    expect(source).not.toContain('useAudioStream');
    expect(source).not.toContain('setAudioModeAsync');
    expect(source).not.toContain('AudioBufferSourceNode');
    expect(source).not.toContain('createBufferSource');
  });

  test('uses the API live contract and handles server interruption', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(source).toContain('parseVoiceLiveToken');
    expect(source).toContain('buildGeminiLiveConfig');
    expect(source).toContain("effect.type === 'interrupted'");
    // Engine is the sole epoch owner — nextEpoch() is called, then interruptOutput(newEpoch)
    expect(source).toContain('engine?.nextEpoch()');
    expect(source).toContain('engine?.interruptOutput(newEpoch)');
  });

  test('waits for setup before starting the conversation', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(source).toContain("effect.type === 'setup-complete'");
    expect(source).toContain('setupReady');
    expect(source).toContain('session.sendClientContent');
    expect(source).toContain('Start with a brief, warm greeting');
  });

  test('starts audio alongside the token and stops when the user hangs up mid-connect', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    const audio = source.indexOf('const audioReady = engine.start(');
    const token = source.indexOf('await (tokenRequest ?? requestToken())');
    const session = source.indexOf('({ session } = await openLiveSession(liveToken, { activateNow: true }))');
    expect(audio).toBeGreaterThan(-1);
    expect(audio).toBeLessThan(token);
    expect(token).toBeLessThan(session);
    expect(source).toContain('await audioReady;');
    // Every await in connect() is followed by a hang-up check.
    expect(source.match(/if \(callEnded\(\)\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(source).toContain('session.close();');
  });

  test('starts from a call prepared before the tap, keeping the mic off until then', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();
    const screen = await Bun.file(new URL('../../../app/voice-call.tsx', import.meta.url)).text();

    // Prepared: session opened inactive, its messages held, greeting asked for.
    expect(source).toContain('activateNow: false,\n            buffer,');
    // The prepared session never touches audio: the engine starts only in connect().
    const warmUp = source.slice(source.indexOf('const warmUp = useCallback('), source.indexOf('const warmUpRef'));
    expect(warmUp).not.toContain('engine.start(');
    expect(warmUp).toContain('session.sendClientContent');
    // On the tap: claimed before anything awaits, replayed after audio is ready.
    const connect = source.slice(source.indexOf('const connect = useCallback('));
    expect(connect.indexOf('warming.claimed = true')).toBeLessThan(connect.indexOf('await '));
    expect(connect.indexOf('await audioReady;')).toBeLessThan(connect.indexOf('warm.buffer.release('));
    // Leaving the screen closes it.
    expect(screen).toContain('useEffect(() => cancelPrefetch, [cancelPrefetch]);');
  });

  test('prefetches the session token from the call screen', async () => {
    const screen = await Bun.file(new URL('../../../app/voice-call.tsx', import.meta.url)).text();
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(screen).toContain("if (stage !== 'ready' || !voiceInSync) return;");
    expect(screen).toContain('prefetch({ memoryId: effectiveMemoryId');
    expect(source).toContain('tokenPrefetchRef.current?.take(');
  });

  test('the Interrupt button keeps the abandoned response from playing again', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();
    const interrupt = source.slice(source.indexOf('const interrupt = useCallback'));

    expect(interrupt).toContain('responseGateRef.current?.interruptLocally()');
    expect(interrupt).toContain('syncCompletedTurns(true)');
    expect(source).toContain(
      "} else if (effect.type === 'output-audio') {\n          if (responseGateRef.current?.acceptOutput() === false) continue;",
    );
    expect(source).toContain(
      "} else if (effect.type === 'output-transcript') {\n          if (responseGateRef.current?.acceptTranscript() === false) continue;",
    );
    expect(source).toContain('if (discarded) continue;');
  });

  test('scopes socket messages and setup to their own socket, with deadlines', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    // Setup completion is resolved per socket, never through the shared handler.
    expect(source).not.toContain('setupReadyRef.current?.resolve()');
    expect(source).toContain('if (raw.setupComplete || raw.setup_complete) setupReady.resolve();');
    expect(source).toContain('if (!transports.isActive(transport)) return;');
    expect(source).toContain('transportsRef.current?.activate(transport);');
    expect(source).toContain("'Voice session setup timed out.'");
    expect(source).toContain('{ timeout: VOICE_TOKEN_TIMEOUT_MS }');
    expect(source).toContain('nextReconnectDelay(attempt, Date.now() - startedAt)');
    // A failed reconnect after go-away or a network change ends the call.
    expect(source).toContain("endCallIfReconnectFailedRef.current(result, 'go-away')");
    expect(source).toContain("endCallIfReconnectFailedRef.current(result, 'network-change')");
    // Late tool results never reach a later call.
    expect(source).toContain('toolRelayRef.current?.dispose();');
  });

  test('keeps unsaved transcript turns and the call end on the device until the server has them', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(source).toContain('outbox?.saveTurns(callSessionId, savedMemoryId, pending)');
    expect(source).toContain('.markEnded(turnSync.getSessionId(), finalDuration)');
    expect(source).toContain('.then(() => outbox.drain((url, body) => post(url, body)))');
    expect(source).toContain('skipSessionId: isSessionActiveRef.current ? sessionIdRef.current : undefined');
    expect(source).toContain('if (state.isConnected) drain();');
  });

  test('signals a paused microphone and lets earphone users talk over the greeting', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(source).toContain('sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });');
    expect(source).toContain(
      'isGreetingActiveRef.current = !fullDuplexRef.current && !engine.isHeadphonesActive();',
    );
  });

  test('passes the selected catalog provider name directly into Gemini Live', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(source).toContain("voiceName?: string");
    expect(source).toContain("voiceName ?? 'Fenrir'");
    expect(source).not.toContain("activeVoice.id === 'deep-masculine'");
    expect(source).not.toContain('VOICE_OPTIONS');
  });

  test('keeps calls alive in the background and makes native close callbacks idempotent', async () => {
    const hook = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();
    const engine = await Bun.file(new URL('./voice-audio-engine.ts', import.meta.url)).text();

    expect(engine).toContain("if (state === 'background')");
    expect(engine).not.toContain('Voice mode ended when Memento moved to the background');
    expect(hook).toContain('callNotificationRef.current?.start(');
    expect(hook).toContain('callNotificationRef.current?.stop()');
    expect(hook).toContain('if (isDisconnectingRef.current) return');
    expect(hook).toContain('onclose: (event) =>');
    expect(hook).toContain('void disconnectRef.current()');
  });

  test('records the call end after the final turns are saved', async () => {
    const hook = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();
    const flush = hook.indexOf('transcriptPersisted = await turnSync.flush()');
    const end = hook.indexOf('voiceCallEndPath(turnSync.getSessionId())');

    expect(flush).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(flush);
    expect(hook).toContain('buildVoiceCallEndBody(finalDuration, savedMemoryId)');
  });

  test('turns recorder failures into the reconnectable connection state', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(source).toContain('onFatalError: (error) =>');
    expect(source).toContain("kind: 'connection-error'");
    expect(source).toContain('Voice audio was interrupted. Tap to reconnect.');
  });

  test('persists voice transcripts to memory and invalidates chat query cache', async () => {
    const hook = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();
    const chatScreen = await Bun.file(new URL('../../screens/ChatScreen.tsx', import.meta.url)).text();
    const bubble = await Bun.file(new URL('../../components/chat/MessageBubble.tsx', import.meta.url)).text();

    expect(hook).toContain('endpoint.addMessageToMemory');
    expect(hook).toContain('queryKeys.promptMessages');
    expect(hook).toContain('primary_conversation_id');
    expect(chatScreen).toContain('useFocusEffect(');
    expect(chatScreen).toContain('queryKeys.promptMessages');
    expect(bubble).toContain('isVoice');
    expect(bubble).toContain('Spoken');
  });

  test('logs privacy-safe Gemini transcript delivery diagnostics', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(source).toContain('summarizeVoiceServerMessage');
    expect(source).toContain("'[VoiceMode] Gemini event'");
    expect(source).toContain("'[VoiceMode] transcript metrics'");
  });

  test('drops microphone audio while offline instead of queueing it', async () => {
    const hook = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();
    const guard = hook.indexOf('if (lastNetworkRef.current?.isConnected === false) {');
    const send = hook.indexOf('sessionRef.current?.sendRealtimeInput({', guard);

    expect(guard).toBeGreaterThan(-1);
    expect(send).toBeGreaterThan(guard);
    expect(hook).toContain('diagnostics.micFramesDroppedOffline += 1;');
  });

  test('the hook takes both audio settings from the audio policy', async () => {
    const hook = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(hook).toContain('const VOICE_AUDIO_POLICY = resolveVoiceAudioPolicy({');
    expect(hook).toContain('const SPEAKER_FULL_DUPLEX = VOICE_AUDIO_POLICY.speakerFullDuplex;');
    expect(hook).toContain('iosVoiceProcessing: VOICE_AUDIO_POLICY.iosVoiceProcessing,');
    expect(hook).toContain("process.env.EXPO_PUBLIC_VOICE_IOS_VOICE_PROCESSING === 'true'");
  });
});

