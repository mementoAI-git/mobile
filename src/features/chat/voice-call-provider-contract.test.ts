import { describe, expect, test } from 'bun:test';

const read = (path: string) => Bun.file(new URL(`../../../${path}`, import.meta.url)).text();

describe('app-wide voice call', () => {
  test('the root layout owns the call and wraps the screens in the call strip', async () => {
    const layout = await read('app/_layout.tsx');

    expect(layout).toContain('<VoiceCallProvider>');
    expect(layout).not.toContain('FloatingCallBar');
    expect(layout.indexOf('<CallStripLayout>')).toBeLessThan(layout.indexOf('<Stack'));
    expect(layout.indexOf('</Stack>')).toBeLessThan(layout.indexOf('</CallStripLayout>'));
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

  test('the call strip pushes screens down instead of covering them', async () => {
    const strip = await read('src/components/chat/CallStrip.tsx');

    expect(strip).toContain('shouldShowCallStrip({');
    expect(strip).toContain('<SafeAreaInsetsContext.Provider value={screenInsets}>');
    expect(strip).toContain('{ ...insets, top: 0 }');
    expect(strip).toContain('accessibilityLabel="End call"');
    expect(strip).toContain('voice.disconnect()');
  });

  test('the call screen is a view onto the provider call', async () => {
    const screen = await read('app/voice-call.tsx');

    expect(screen).toContain('useVoiceCall()');
    expect(screen).not.toContain('useVoiceMode(');
    expect(screen).not.toContain('useBackgroundMusic');
    expect(screen).toContain('accessibilityLabel="Minimize call"');
    expect(screen).toContain("return voice.isMuted ? 'muted' : 'live';");
  });
  test('the provider mirrors the call into the iOS Live Activity', async () => {
    const provider = await read('src/hooks/use-voice-call.tsx');

    expect(provider).toContain('createCallActivityAdapter(Platform.OS)');
    expect(provider).toContain('callActivity.controller.sync({');
    expect(provider).toContain("if (action === 'end') void current.disconnect();");
    expect(provider).toContain('current.setMuted(!current.isMuted)');
  });
});