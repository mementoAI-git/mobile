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

  test('shows the intro until a voice is saved, then starts the call and closes', async () => {
    const route = await Bun.file(new URL('../../../app/voice-call.tsx', import.meta.url)).text();
    expect(route).toContain("setStage('intro')");
    expect(route).toContain("setStage('choosing')");
    expect(route).toContain('<VoiceIntro onChooseVoice={openPicker} onDismiss={dismiss} />');
    expect(route).toContain('startCall({ memoryId: effectiveMemoryId, voiceName: choice.providerVoiceName });');
    expect(route).toContain('useVoiceCall()');
    // Select voice: a 48px pill.
    expect(route).toContain('rounded="full"');
    expect(route).toContain('style={{ height: 48, minHeight: 48 }}');
  });

});
