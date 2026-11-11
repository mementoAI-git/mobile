import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

test('every recording attachment uses the one recording card', () => {
  const card = readFileSync('src/components/media/AudioAttachmentCard.tsx', 'utf8');
  // One layout only: the old square tiles are gone.
  expect(card).not.toContain("'tile'");
  expect(card).not.toContain('albumArt');
  expect(card).toContain('backgroundColor: COLORS.fillWeak, borderRadius: radius(compact ? 16 : 20)');
  expect(card).toContain('backgroundColor: COLORS.activeFill');
  expect(card).toContain('recordingWaveform(');
  const users = {
    'app/(tabs)/stories/[id].tsx': 'onPress={openPreview}',
    'app/editor.tsx': 'onRemove={() => onRemove(a.clientId)}',
    'app/create.tsx': '<AudioAttachmentCard',
    'src/components/chat/ChatInput.tsx': '<AudioAttachmentCard',
    'src/components/overview/OverviewCaptureCard.tsx': '<AudioAttachmentCard',
  };
  for (const [file, usage] of Object.entries(users)) {
    const source = readFileSync(file, 'utf8');
    expect(source).toContain('<AudioAttachmentCard');
    expect(source).toContain(usage);
  }
  expect(readFileSync('app/create.tsx', 'utf8')).not.toContain('function VoiceCard');
  expect(readFileSync('src/components/overview/OverviewCaptureCard.tsx', 'utf8')).not.toContain('voiceChip');
});

test('the story date icon uses the brand colour', () => {
  const page = readFileSync('app/(tabs)/stories/[id].tsx', 'utf8');
  expect(page).toContain('<CalendarDays size={14} color={COLORS.brand}');
});
