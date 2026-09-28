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
    expect(source).toContain('interruptOutput(effect.epoch)');
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

  test('disconnects on background and makes native close callbacks idempotent', async () => {
    const hook = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();
    const engine = await Bun.file(new URL('./voice-audio-engine.ts', import.meta.url)).text();

    expect(engine).toContain("if (state === 'background')");
    expect(engine).not.toContain("state === 'active'");
    expect(hook).toContain('if (isDisconnectingRef.current) return');
    expect(hook).toContain('onclose: () =>');
    expect(hook).toContain('void disconnectRef.current()');
  });

  test('turns recorder failures into the reconnectable connection state', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(source).toContain('onFatalError: (error) =>');
    expect(source).toContain("kind: 'connection-error'");
    expect(source).toContain('Voice audio was interrupted. Tap to reconnect.');
  });
});
