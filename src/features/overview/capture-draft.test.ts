import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  buildStoryHandoff,
  formatVoiceNoteDuration,
  parseSavedVoiceNotes,
  parseStoryHandoff,
  storyBodyFromText,
} from './capture-draft';
import { enrichmentStrength } from './enrichment-strength';

describe('overview capture draft', () => {
  test('turns each line into an escaped paragraph, like web', () => {
    expect(storyBodyFromText('Hi <b>"you"</b>\nA & B')).toBe(
      '<p>Hi &lt;b&gt;&quot;you&quot;&lt;/b&gt;</p><p>A &amp; B</p>',
    );
  });

  test('round-trips a story handoff through the editor route param', () => {
    const handoff = buildStoryHandoff('h1', 'Morning walk', [
      { fileId: 'f1', url: 'https://x/a.m4a', name: 'a.m4a', mimeType: 'audio/m4a', duration: 12 },
    ]);
    const parsed = parseStoryHandoff(encodeURIComponent(JSON.stringify(handoff)));
    expect(parsed?.handoffId).toBe('h1');
    expect(parsed?.body).toBe('<p>Morning walk</p>');
    expect(parsed?.attachments).toEqual([
      { id: 'f1', url: 'https://x/a.m4a', name: 'a.m4a', type: 'audio/m4a', duration: 12, isVoice: true },
    ]);
  });

  test('a voice-only handoff has an empty body', () => {
    expect(buildStoryHandoff('h2', '   ', []).body).toBe('');
  });

  test('ignores malformed handoffs and saved voice notes', () => {
    expect(parseStoryHandoff(undefined)).toBeNull();
    expect(parseStoryHandoff('%7Bnope')).toBeNull();
    expect(parseSavedVoiceNotes('not json')).toEqual([]);
    expect(parseSavedVoiceNotes(JSON.stringify([{ fileId: '' }, { fileId: 'ok', name: 'v' }, null]))).toEqual([
      { fileId: 'ok', name: 'v' } as any,
    ]);
  });

  test('formats voice note durations', () => {
    expect(formatVoiceNoteDuration(0)).toBe('0:00');
    expect(formatVoiceNoteDuration(75.9)).toBe('1:15');
  });
});

describe('overview enrichment summary', () => {
  test('shows a strength word, matching web chat settings', () => {
    expect(enrichmentStrength(undefined)).toBe('–');
    expect(enrichmentStrength(11)).toBe('Getting started');
    expect(enrichmentStrength(35)).toBe('Medium');
    expect(enrichmentStrength(70)).toBe('Strong');
  });

  test('overview uses the summary card and drops the old hero and spotlight', () => {
    const overview = readFileSync('app/(tabs)/overview/index.tsx', 'utf8');
    expect(overview).toContain('<EnrichmentSummaryCard');
    expect(overview).not.toContain('Share stories & files to build context');
    expect(overview).not.toContain('MemorySpotlightCard');
    expect(overview).not.toContain('MemoryPromptCard');
  });
});

describe('reflection card highlight', () => {
  test('orange highlighted words use the loaded serif italic face', () => {
    const card = readFileSync('src/components/explore/ContinueReflectingCard.tsx', 'utf8');
    expect(card).toContain('className="text-brand" style={TYPE.reflectionTitleAccent}');
    expect(card).not.toContain('text-brand italic');
  });
});

describe('overview navigation', () => {
  test('reflection cards open the full reflection page, not a sheet', () => {
    const section = readFileSync('src/components/overview/DailyPromptSection.tsx', 'utf8');
    expect(section).toContain("pathname: '/chat/[id]'");
    expect(section).not.toContain("openSheet('quick-capture'");
  });

  test('tapping the capture card opens the add story page', () => {
    const card = readFileSync('src/components/overview/OverviewCaptureCard.tsx', 'utf8');
    expect(card).toContain('onPress={handleOpenComposer}');
    expect(card).not.toContain('<TextInput');
  });
});
