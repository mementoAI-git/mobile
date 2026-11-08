// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('pinned voice session banner', () => {
  test('sits outside the message list beneath the header and replaces deep dive surfaces', async () => {
    const source = await Bun.file(new URL('../../screens/ChatScreen.tsx', import.meta.url)).text();
    const banner = source.indexOf('{showInlineVoice && <VoiceChatComposer />}');
    expect(banner).toBeGreaterThan(source.indexOf('onPress={handleActions}'));
    expect(banner).toBeLessThan(source.indexOf('<View style={styles.messageList}>'));
    // The deep dive nudge card is removed from the app for now.
    expect(source).not.toContain('DeepDiveNudge');
    expect(source).toContain('collapsedComposerHeight: COLLAPSED_COMPOSER_HEIGHT');
    expect(source.match(/<VoiceChatComposer\s*\/>/g)).toHaveLength(1);
  });

  test('provides live/muted feedback and keeps the microphone, settings and end controls', async () => {
    const source = await Bun.file(new URL('../../components/chat/VoiceChatComposer.tsx', import.meta.url)).text();
    expect(source).toContain("voice.isMuted ? 'You’re muted'");
    expect(source).toContain("'Live session'");
    expect(source).toContain('borderRadius: 20');
    expect(source).toContain('muted ? colors.activeFill : colors.fillWeak');
    expect(source).toContain('muted ? colors.error : connected ? colors.success');
    expect(source).toContain('voice.setMuted(!voice.isMuted)');
    expect(source).toContain("openSheet('end-voice-session'");
    expect(source).toContain("openSheet('voice-call-settings'");
    expect(source).toContain('<VoiceArtwork');
  });
});
