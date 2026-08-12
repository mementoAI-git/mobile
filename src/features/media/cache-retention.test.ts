// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const videoThumbnail = readFileSync('src/components/ui/VideoThumbnail.tsx', 'utf8');
const pickerSheet = readFileSync('src/components/chat/ChatAttachmentPickerSheet.tsx', 'utf8');

describe('media cache retention', () => {
  test('keeps video thumbnail cache within a tight bounded limit', () => {
    expect(videoThumbnail).toContain('const CACHE_MAX = 32;');
    expect(videoThumbnail).toContain('export function clearVideoThumbnailCache');
  });

  test('drops asset picker caches promptly when the sheet is dismissed', () => {
    expect(pickerSheet).toContain('const CACHE_TTL_MS = 20_000;');
    expect(pickerSheet).toContain('export function clearAssetCache');
    expect(pickerSheet).toContain('clearAssetCache();');
  });
});
