import { describe, expect, test } from 'bun:test';

const read = (path: string) => Bun.file(new URL(`../../../${path}`, import.meta.url)).text();

describe('app-wide voice call', () => {
  test('the root layout owns the call and wraps the screens in the call indicator', async () => {
    const layout = await read('app/_layout.tsx');

    expect(layout).toContain('<VoiceCallProvider>');
    expect(layout).not.toContain('FloatingCallBar');
    expect(layout.indexOf('<CallIndicatorLayout>')).toBeLessThan(layout.indexOf('<Stack'));
    expect(layout.indexOf('</Stack>')).toBeLessThan(layout.indexOf('</CallIndicatorLayout>'));
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

  test('the call indicator floats over screens without moving them', async () => {
    const indicator = await read('src/components/chat/CallIndicator.tsx');

    expect(indicator).toContain('shouldShowCallIndicator({');
    expect(indicator).toContain('callIndicatorVariant(Platform.OS, insets.top)');
    expect(indicator).toContain('islandCapsuleFrame(topInset)');
    expect(indicator).toContain('backgroundColor: COLORS.dynamicIsland');
    expect(indicator).not.toContain('SafeAreaInsetsContext');
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