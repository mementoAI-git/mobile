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

  test('the floating call floats over every screen, sheet and native full-screen page', async () => {
    const indicator = await Bun.file(new URL('../../components/chat/CallIndicator.tsx', import.meta.url)).text();
    const floating = await Bun.file(new URL('../../components/chat/FloatingVoiceCall.tsx', import.meta.url)).text();
    expect(indicator).toContain('<FloatingVoiceCall />');
    expect(floating).toContain('<FullWindowOverlay>');
    expect(floating).toContain('resolveFloatingCallRelease(');
    expect(floating).toContain('accessibilityLabel={`Show voice call');
  });


  test('the voice page and floating call are views onto the provider call', async () => {
    const screen = await Bun.file(new URL('../../../app/voice-call.tsx', import.meta.url)).text();
    const floating = await Bun.file(new URL('../../components/chat/FloatingVoiceCall.tsx', import.meta.url)).text();
    expect(screen).toContain('useVoiceCall()');
    expect(screen).not.toContain('useVoiceMode(');
    expect(floating).toContain("return 'Reconnecting…';");
    expect(floating).not.toContain('useVoiceMode(');
  });

  test('the provider mirrors the call into the iOS Live Activity', async () => {
    const provider = await read('src/hooks/use-voice-call.tsx');

    expect(provider).toContain('createCallActivityAdapter(Platform.OS)');
    expect(provider).toContain('callActivity.controller.sync({');
    expect(provider).toContain("if (action === 'end') void current.disconnect();");
    expect(provider).toContain('current.setMuted(!current.isMuted)');
  });

  test('call surfaces hide the moment the call is hung up', async () => {
    const provider = await Bun.file(new URL('../../hooks/use-voice-call.tsx', import.meta.url)).text();
    const floating = await Bun.file(new URL('../../components/chat/FloatingVoiceCall.tsx', import.meta.url)).text();
    expect(provider).toContain('isConnected: callLive,');
    expect(floating).toContain('voice.isConnecting || voice.isReconnecting || isCallLive(voice)');
  });


  test('a Live Activity button with no live call clears the card', async () => {
    const provider = await read('src/hooks/use-voice-call.tsx');

    expect(provider).toContain('if (!isCallLive(current)) {');
    expect(provider).toContain('callActivity.controller.endNow();');
  });

  test('tells the user when a call could not start instead of silently resetting', async () => {
    const provider = await Bun.file(new URL('../../hooks/use-voice-call.tsx', import.meta.url)).text();
    expect(provider).toContain("voice.connectionFailure?.kind === 'connection-error'");
    // A plan without voice reopens the voice page, which explains the upgrade.
    expect(provider).toContain("failureKind === 'upgrade-required'");
  });


  test('saves the chosen voice to the profile before a call token is built for it', async () => {
    const screen = await Bun.file(new URL('../../../app/voice-call.tsx', import.meta.url)).text();
    const sheet = await Bun.file(new URL('../../components/sheets/VoiceCallSettingsSheet.tsx', import.meta.url)).text();
    expect(screen).toContain('if (!choice || !(await persistVoice(choice))) return;');
    expect(screen.indexOf('await persistVoice(choice);')).toBeLessThan(screen.indexOf('startCall({'));
    expect(sheet).toContain('await saveCallVoice(voice, { saveProfile: updateProfileAsync, saveLocal: selectVoice });');
    expect(sheet).not.toContain('updateProfile({ chat_voice');
  });

});
