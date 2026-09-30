import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('media surfaces responsive sizing and live dimensions', () => {
  const mediaPreviewModalSource = readFileSync(
    resolve(process.cwd(), 'src/components/ui/MediaPreviewModal.tsx'),
    'utf-8',
  );
  const emojiPickerSheetSource = readFileSync(
    resolve(process.cwd(), 'src/components/chat/EmojiPickerSheet.tsx'),
    'utf-8',
  );
  const chatAttachmentPickerSource = readFileSync(
    resolve(process.cwd(), 'src/components/chat/ChatAttachmentPickerSheet.tsx'),
    'utf-8',
  );
  const selectFromMediaSource = readFileSync(
    resolve(process.cwd(), 'src/components/sheets/SelectFromMediaModal.tsx'),
    'utf-8',
  );

  test('eliminates module-level Dimensions.get snapshots from media surfaces', () => {
    // MediaPreviewModal
    const previewLines = mediaPreviewModalSource.split('\n');
    const previewModuleDims = previewLines.filter((l) =>
      l.includes("Dimensions.get('window')") || l.includes('Dimensions.get("window")'),
    );
    expect(previewModuleDims.length).toBe(0);

    // EmojiPickerSheet
    const emojiLines = emojiPickerSheetSource.split('\n');
    const emojiModuleDims = emojiLines.filter((l) =>
      l.includes("Dimensions.get('window')") || l.includes('Dimensions.get("window")'),
    );
    expect(emojiModuleDims.length).toBe(0);

    // ChatAttachmentPickerSheet
    const attachLines = chatAttachmentPickerSource.split('\n');
    const attachModuleDims = attachLines.filter((l) =>
      l.includes("Dimensions.get('window')") || l.includes('Dimensions.get("window")'),
    );
    expect(attachModuleDims.length).toBe(0);

    // SelectFromMediaModal
    const selectLines = selectFromMediaSource.split('\n');
    const selectModuleDims = selectLines.filter((l) =>
      l.includes("Dimensions.get('window')") || l.includes('Dimensions.get("window")'),
    );
    expect(selectModuleDims.length).toBe(0);
  });
});
