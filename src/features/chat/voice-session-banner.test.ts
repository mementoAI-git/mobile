// @ts-nocheck
import { describe, expect, test } from 'bun:test';

const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text();

describe('chat screen voice session', () => {
  test('uses the floating call card only, with the beam beneath the messages and input', async () => {
    const source = await read('../../screens/ChatScreen.tsx');
    // One voice panel: the floating card, never a second inline one.
    expect(source).not.toContain('VoiceChatComposer');
    // The deep dive nudge card is removed from the app for now.
    expect(source).not.toContain('DeepDiveNudge');
    expect(source).toContain('collapsedComposerHeight: COLLAPSED_COMPOSER_HEIGHT');
    // The beam is drawn before the screen content, so it sits beneath it.
    const beam = source.indexOf('<VoiceScreenBeam');
    expect(beam).toBeGreaterThan(source.indexOf("edges={['top', 'bottom']}>"));
    expect(beam).toBeLessThan(source.indexOf('<MessageActionsProvider>'));
  });

  test('lets messages scroll under a transparent header', async () => {
    const source = await read('../../screens/ChatScreen.tsx');
    expect(source).toContain('marginTop: -listUnderHeader');
    const header = source.slice(source.indexOf('  header: {'), source.indexOf('  headerButton: {'));
    expect(header).toContain('zIndex: 10');
    expect(header).not.toContain('backgroundColor');
    expect(header).not.toContain('borderBottom');
  });

  test('opens voice settings when the floating card is tapped', async () => {
    const source = await read('../../components/chat/FloatingVoiceCall.tsx');
    expect(source).toMatch(/onPress=\{openSettings\}\s+accessibilityRole="button"\s+accessibilityLabel="Voice call settings"\s+style=\{\[StyleSheet\.absoluteFill/);
    expect(source).toContain("openSheet('voice-call-settings'");
    expect(source).toContain("openSheet('end-voice-session'");
  });
});
