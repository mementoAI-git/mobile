// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('chat settings reference geometry', () => {
  test('maps the 393-point reference into responsive card widths', async () => {
    let layoutModule: typeof import('./chat-settings-layout') | undefined;

    try {
      layoutModule = await import('./chat-settings-layout');
    } catch {
      // The first TDD run intentionally reaches this branch until the
      // reference layout contract is implemented.
    }

    expect(layoutModule?.getChatSettingsLayout).toBeFunction();

    const layout = layoutModule!.getChatSettingsLayout(393);
    expect(layout.contentWidth).toBe(353);
    expect(layout.mediaTileWidth).toBeCloseTo(67.4);
    expect(layout.selectionCardWidth).toBe(170.5);
    expect(layout.insightCardWidth).toBe(172);

    const narrowLayout = layoutModule!.getChatSettingsLayout(320);
    expect(narrowLayout.contentWidth).toBe(280);
    expect(narrowLayout.mediaTileWidth).toBeCloseTo(52.8);
    expect(narrowLayout.selectionCardWidth).toBe(134);
  });
});

describe('chat settings voice and ambience cards', () => {
  test('are outline-only at 20px radius and padding, with a weak fill when chosen', async () => {
    const source = await Bun.file(new URL('../../../app/chat/settings.tsx', import.meta.url)).text();
    expect(source).toContain("backgroundColor: 'transparent',\n    borderColor: COLORS.fillWeak,\n    borderRadius: 20,");
    expect(source).toContain('padding: 20,');
    expect(source).toContain('selectionCardSelected: {\n    backgroundColor: COLORS.fillWeak,\n  },');
  });

  test('use the web volume control: label, white-on-dark range and thumb, percentage', async () => {
    const source = await Bun.file(new URL('../../../app/chat/settings.tsx', import.meta.url)).text();
    expect(source).toContain('>Volume</Text>');
    expect(source).toContain('{value}%</Text>');
    expect(source).toContain('sliderFill: {\n    backgroundColor: COLORS.textStrong,');
    expect(source).toContain('sliderThumb: {\n    backgroundColor: COLORS.textStrong,');
  });
});

describe('chat settings details', () => {
  test('back button, shared media padding, card-wide enrichment tap and instant voice samples', async () => {
    const source = await Bun.file(new URL('../../../app/chat/settings.tsx', import.meta.url)).text();
    const card = await Bun.file(new URL('../../components/overview/EnrichmentSummaryCard.tsx', import.meta.url)).text();
    const hook = await Bun.file(new URL('../../hooks/use-voice-sample-clips.ts', import.meta.url)).text();
    expect(source).toContain("roundButton: {\n    alignItems: 'center',\n    backgroundColor: COLORS.fillWeak,");
    expect(source).toContain('paddingHorizontal: 20,\n    paddingVertical: 16,\n  },\n  sharedLabel');
    expect(source).toContain("router.push({ pathname: '/insights', params: { section: 'enrichment' } })");
    expect(card).toContain('<TouchableOpacity\n      onPress={onViewInsight}');
    // The sample plays before the save, and the current voice replays.
    expect(source.indexOf('playVoiceSample(voiceId);')).toBeLessThan(source.indexOf('if (voiceId === activeVoiceId) return;'));
    expect(hook).toContain('createAudioPlayer(clip.asset)');
    expect(hook).toContain('VOICE_PREVIEW_CLIPS');
  });

  test('shared media tabs use the paired active fill and text', async () => {
    const media = await Bun.file(new URL('../../../app/chat/media.tsx', import.meta.url)).text();
    expect(media).toContain('backgroundColor: active ? COLORS.activeFill : COLORS.fillWeak');
    expect(media).toContain('color: active ? COLORS.activeText : COLORS.textStrong');
    expect(media).not.toContain('COLORS.textInverse : COLORS.textStrong');
  });
});
