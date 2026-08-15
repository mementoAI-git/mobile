// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { getMediaCategory, inferMediaMimeType } from './media-type';

describe('media type inference', () => {
  test('keeps a specific API mime type', () => {
    expect(inferMediaMimeType({ mimeType: 'image/webp', name: 'file.bin', uri: '' })).toBe('image/webp');
  });

  test('infers missing and generic attachment types from names and URL paths', () => {
    expect(inferMediaMimeType({ name: 'PHOTO.HEIC', uri: '' })).toBe('image/heic');
    expect(inferMediaMimeType({ mimeType: 'application/octet-stream', name: '', uri: 'https://cdn.test/video.MOV?token=x' })).toBe('video/quicktime');
    expect(inferMediaMimeType({ mimeType: '', name: 'voice.m4a', uri: '' })).toBe('audio/mp4');
    expect(inferMediaMimeType({ mimeType: 'application/octet-stream', name: 'document.pdf', uri: '' })).toBe('application/pdf');
  });

  test('returns consistent categories for tile and full-preview selection', () => {
    expect(getMediaCategory({ name: 'photo.jpeg', uri: '' })).toBe('image');
    expect(getMediaCategory({ name: '', uri: 'https://cdn.test/clip.mp4' })).toBe('video');
    expect(getMediaCategory({ name: 'recording.ogg', uri: '' })).toBe('audio');
    expect(getMediaCategory({ name: 'archive.zip', uri: '' })).toBe('file');
  });
});
