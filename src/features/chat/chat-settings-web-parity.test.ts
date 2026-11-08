import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { spokenReplyChunks, spokenReplyErrorMessage } from '@/features/speech/spoken-audio';

const settings = readFileSync('app/chat/settings.tsx', 'utf8');
// The rendered screen only, not the file's opening comment.
const jsx = settings.slice(settings.indexOf("<SafeAreaView edges={['top']}"));

describe('chat settings', () => {
  test('keeps the full-screen page and its warm gradient', () => {
    expect(settings).toContain('<SafeAreaView');
    expect(settings).toContain("colors={[COLORS.brandTint, COLORS.brandSubtle, 'transparent']}");
    expect(settings).toContain('Chat settings');
  });

  test('orders enrichment and shared files, AI Voice (narration, voices), Background Ambience', () => {
    const order = ['<EnrichmentSummaryCard', 'Shared media & links', 'AI Voice', 'Voice narration', 'VOICE_CATALOG.map', 'Background Ambience', '<VolumeSlider', 'backgroundTracks.map']
      .map((text) => jsx.indexOf(text));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test('sections sit 40px apart; the enrichment card uses 20px padding and radius', () => {
    expect(settings).toContain('content: {\n    gap: 40,');
    expect(settings).toMatch(/enrichmentCard: \{[^}]*borderRadius: 20,[^}]*paddingHorizontal: 20,[^}]*paddingTop: 20,[^}]*paddingBottom: 20,/);
    expect(jsx).not.toContain('styles.separator');
  });

  test('voices and tunes are cards on the page, not a separate picker', () => {
    expect(jsx).toContain('<SelectionCard');
    expect(settings).not.toContain("openSheet('chat-voice-picker'");
  });

  test('narration is switched in chat settings only; the chat header uses the web settings icon', () => {
    const chat = readFileSync('src/screens/ChatScreen.tsx', 'utf8');
    expect(settings).toContain('useSpokenRepliesStore');
    expect(chat).not.toContain('Turn voice narration on');
    expect(chat).not.toContain("icons/ellipsis'");
    expect(chat).toContain("import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';");
    expect(chat).toContain('void narration.speak(text)');
    expect(chat).not.toContain("params: { feature: 'narration' }");
  });
});

describe('voice narration', () => {
  test('speaks plain text in a short first clip, then longer ones', () => {
    const chunks = spokenReplyChunks(`**Hi** there. ${'Memory '.repeat(80)}`);
    expect(chunks[0].startsWith('Hi there.')).toBe(true);
    expect(chunks[0].length).toBeLessThanOrEqual(200);
    expect(chunks.slice(1).every((chunk) => chunk.length <= 480)).toBe(true);
    expect(spokenReplyChunks('```code only```')).toEqual([]);
  });

  test('explains failures warmly', () => {
    expect(spokenReplyErrorMessage({ response: { status: 404 } })).toBe('Voice narration isn’t available on this server yet.');
    expect(spokenReplyErrorMessage(new Error('offline'))).toContain('Check your connection');
  });
});
