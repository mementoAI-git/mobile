// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const videoThumbnail = readFileSync('src/components/ui/VideoThumbnail.tsx', 'utf8');

describe('media cache retention', () => {
  test('keeps video thumbnail cache within a tight bounded limit', () => {
    expect(videoThumbnail).toContain('const CACHE_MAX = 32;');
    expect(videoThumbnail).toContain('export function clearVideoThumbnailCache');
  });
});
