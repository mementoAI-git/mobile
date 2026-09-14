// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('voice call route contract', () => {
  test('owns modal safe area and replaces the legacy nested overlay', async () => {
    const route = await Bun.file(new URL('../../../app/voice-call.tsx', import.meta.url)).text();
    const chat = await Bun.file(new URL('../../screens/ChatScreen.tsx', import.meta.url)).text();

    expect(route).toContain('<NativeModalSafeAreaBoundary>');
    expect(route).toContain("edges={['top', 'bottom']}");
    expect(chat).toContain("pathname: '/voice-call'");
    expect(chat).not.toContain('VoiceModeOverlay');
  });

  test('supports first-time selection and returning-user ready state', async () => {
    const route = await Bun.file(new URL('../../../app/voice-call.tsx', import.meta.url)).text();
    expect(route).toContain("setStage('choosing')");
    expect(route).toContain("setStage('ready')");
    expect(route).toContain('providerVoiceName');
    expect(route).toContain("getVoiceCallTransition(stage, 'connection-failed')");
    expect(route).toContain('pauseForVoice');
  });
});
