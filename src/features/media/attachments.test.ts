// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  MAX_ATTACHMENT_FILE_BYTES,
  getDocumentUploadInput,
  getMediaUploadInput,
  getUploadedFileFromResponse,
  isFileTooLarge,
} from './attachments';

describe('media attachment helpers', () => {
  test('checks attachment file sizes consistently', () => {
    expect(isFileTooLarge(undefined)).toBe(false);
    expect(isFileTooLarge(null)).toBe(false);
    expect(isFileTooLarge(MAX_ATTACHMENT_FILE_BYTES)).toBe(false);
    expect(isFileTooLarge(MAX_ATTACHMENT_FILE_BYTES + 1)).toBe(true);
  });

  test('normalizes image and video picker assets with stable fallbacks', () => {
    expect(
      getMediaUploadInput({
        uri: 'file:///photo-cache/item',
        mimeType: undefined,
        fileName: undefined,
      }, 1234),
    ).toEqual({
      uri: 'file:///photo-cache/item',
      mimeType: 'image/jpeg',
      name: 'photo_1234.jpg',
      fileSize: undefined,
    });

    expect(
      getMediaUploadInput({
        uri: 'file:///video-cache/item',
        mimeType: 'video/quicktime',
        fileName: undefined,
      }, 1234),
    ).toEqual({
      uri: 'file:///video-cache/item',
      mimeType: 'video/quicktime',
      name: 'video_1234.mp4',
      fileSize: undefined,
    });
  });

  test('normalizes document picker assets with binary fallback mime', () => {
    expect(
      getDocumentUploadInput({
        uri: 'file:///docs/scan',
        name: 'scan',
        mimeType: undefined,
        size: 42,
      }),
    ).toEqual({
      uri: 'file:///docs/scan',
      mimeType: 'application/octet-stream',
      name: 'scan',
      fileSize: 42,
    });
  });

  test('extracts uploaded files from API response variants', () => {
    const file = {
      _id: 'file-1',
      url: 'https://cdn.mymemento.io/file.jpg',
      name: 'file.jpg',
      size: 42,
    };

    expect(getUploadedFileFromResponse(file)).toEqual(file);
    expect(getUploadedFileFromResponse({ data: file })).toEqual(file);
    expect(getUploadedFileFromResponse({ data: [file] })).toEqual(file);
    expect(getUploadedFileFromResponse({ data: [] })).toBeNull();
    expect(getUploadedFileFromResponse(null)).toBeNull();
  });
});
