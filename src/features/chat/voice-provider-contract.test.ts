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
    expect(source).toContain('sessionRef.current.sendClientContent');
    expect(source).toContain('Start with a brief, warm greeting');
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
    expect(hook).toContain('onclose: () =>');
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

