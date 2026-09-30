import { describe, expect, test } from 'bun:test';

const read = (path: string) => Bun.file(new URL(`../../../${path}`, import.meta.url)).text();

describe('app-wide voice call', () => {
  test('the root layout owns the call and shows the floating bar', async () => {
    const layout = await read('app/_layout.tsx');

    expect(layout).toContain('<VoiceCallProvider>');
    expect(layout).toContain('<FloatingCallBar />');
    expect(layout.indexOf('<BackgroundMusicProvider>')).toBeLessThan(
      layout.indexOf('<VoiceCallProvider>'),
    );
  });

  test('the provider pauses music, ends the call on sign-out, and leaves the call screen for actions', async () => {
    const provider = await read('src/hooks/use-voice-call.tsx');

    expect(provider).toContain('pauseForVoice()');
    expect(provider).toContain('resumeAfterVoice()');
    expect(provider).toContain('state.token');
    expect(provider).toContain('pathnameRef.current === VOICE_CALL_PATH');
    expect(provider).toContain('onModelEndedCall: leaveCallScreen');
  });

  test('the floating bar hides on the call screen and can end the call', async () => {
    const bar = await read('src/components/chat/FloatingCallBar.tsx');

    expect(bar).toContain('pathname === VOICE_CALL_PATH');
    expect(bar).toContain('accessibilityLabel="End call"');
    expect(bar).toContain('voice.disconnect()');
  });

  test('the call screen is a view onto the provider call', async () => {
    const screen = await read('app/voice-call.tsx');

    expect(screen).toContain('useVoiceCall()');
    expect(screen).not.toContain('useVoiceMode(');
    expect(screen).not.toContain('useBackgroundMusic');
    expect(screen).toContain('accessibilityLabel="Minimize call"');
    expect(screen).toContain("return voice.isMuted ? 'muted' : 'live';");
  });
});