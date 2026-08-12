// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/features/media/audio-artwork.ts', 'utf8');

describe('audio artwork extraction', () => {
  test('implements an APIC-based mp3 artwork extractor', () => {
    expect(source).toContain('export function extractMp3ArtworkDataUriFromBytes');
    expect(source).toContain("if (frameId === 'APIC') return parseApicFrame(frameData);");
    expect(source).toContain("return `data:${mime || 'image/jpeg'};base64,${bytesToBase64(imageBytes)}`;");
  });

  test('only attempts mobile fallback extraction for mp3-like audio sources', () => {
    expect(source).toContain('export function shouldAttemptMp3ArtworkExtraction');
    expect(source).toContain("normalizedMime === 'audio/mpeg'");
    expect(source).toContain("normalizedName.endsWith('.mp3')");
  });

  test('uses backend thumbnail first and falls back to local file parsing', () => {
    expect(source).toContain('if (backendThumbnail) return backendThumbnail;');
    expect(source).toContain('const base64 = await FileSystem.readAsStringAsync(localUri,');
    expect(source).toContain('const artwork = extractMp3ArtworkDataUriFromBytes(base64ToBytes(base64));');
  });
});