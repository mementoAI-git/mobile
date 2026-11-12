import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { isCallRecordingAttachment } from './call-recording-story';

test('recognises the voice call recording the app uploads', () => {
  expect(isCallRecordingAttachment({ name: 'voice_call_1731312000000.m4a' })).toBe(true);
  expect(isCallRecordingAttachment({ name: 'voice_1731312000000.m4a' })).toBe(false);
  expect(isCallRecordingAttachment({ name: 'song.mp3' })).toBe(false);
  expect(isCallRecordingAttachment(undefined)).toBe(false);
});

test('story cards show recorded conversations as the recording card', () => {
  const card = readFileSync('src/components/memory/MasonryMemoryCard.tsx', 'utf8');
  expect(card).toContain('if (audioMedia && (!bodyText || isCallRecording))');
  expect(card).toContain('<VoiceRecordingCardVisual');
});

test('recording cards follow the masonry ratios and the grid card shape', () => {
  const card = readFileSync('src/components/memory/MasonryMemoryCard.tsx', 'utf8');
  const grid = readFileSync('src/components/memory/MasonryMemoryGrid.tsx', 'utf8');
  expect(card).toContain('aspectRatio={aspectRatio}');
  expect(card).toContain('className="w-full rounded-[14px] relative"');
  expect(card).not.toContain('aspectRatio: VOICE_CARD_SIZE.width / VOICE_CARD_SIZE.height');
  expect(grid).toContain('isCallRecordingAttachment(audioMedia)');
});

test('list rows keep titles to one line and mark recordings with a mic', () => {
  const row = readFileSync('src/components/memory/StoryListRow.tsx', 'utf8');
  expect(row).toContain('<Text numberOfLines={1} style={[TYPE.bodyStrong');
  expect(row).toContain('<Mic size={12}');
  expect(row).toContain('>·</Text>');
});
