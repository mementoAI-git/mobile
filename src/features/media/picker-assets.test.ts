import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { MAX_ATTACHMENT_FILE_BYTES } from './attachments';
import {
  getSystemPickerOptions,
  pickChatLibraryAssets,
  toChatPickerAsset,
  type SystemPickerOptions,
} from './picker-assets';

describe('system photo picker options', () => {
  test('photos and videos together, several at once', () => {
    expect(getSystemPickerOptions('media')).toEqual({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
  });

  test('videos only', () => {
    expect(getSystemPickerOptions('videos').mediaTypes).toEqual(['videos']);
  });
});

describe('picked asset mapping', () => {
  test('maps a picked photo to the upload shape', () => {
    expect(toChatPickerAsset({
      uri: 'file:///cache/ImagePicker/a.jpg',
      assetId: 'asset-1',
      type: 'image',
      fileName: 'a.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1200,
    }, 1)).toEqual({
      id: 'asset-1',
      uri: 'file:///cache/ImagePicker/a.jpg',
      uploadUri: 'file:///cache/ImagePicker/a.jpg',
      name: 'a.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'photo',
      duration: undefined,
      fileSize: 1200,
    });
  });

  test('maps a video, converting its duration to seconds and falling back on missing metadata', () => {
    const asset = toChatPickerAsset({ uri: 'content://picker/42', type: 'video', duration: 4500 }, 7);
    expect(asset.mediaType).toBe('video');
    expect(asset.mimeType).toBe('video/mp4');
    expect(asset.name).toBe('video_7.mp4');
    expect(asset.id).toBe('content://picker/42');
    expect(asset.duration).toBe(4.5);
  });

  test('an untyped item without a known extension uploads as a photo', () => {
    const asset = toChatPickerAsset({ uri: 'content://picker/43' }, 7);
    expect(asset.mimeType).toBe('image/jpeg');
    expect(asset.mediaType).toBe('photo');
  });
});

describe('picking chat attachments', () => {
  test('passes the picker options and returns nothing when the picker is closed', async () => {
    const calls: SystemPickerOptions[] = [];
    const result = await pickChatLibraryAssets('videos', async (options) => {
      calls.push(options);
      return { canceled: true, assets: null };
    });
    expect(calls).toEqual([getSystemPickerOptions('videos')]);
    expect(result).toEqual({ assets: [], oversizedCount: 0 });
  });

  test('leaves out and counts items over the size limit', async () => {
    const result = await pickChatLibraryAssets('media', async () => ({
      canceled: false,
      assets: [
        { uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileSize: 10 },
        { uri: 'file:///b.mp4', mimeType: 'video/mp4', fileSize: MAX_ATTACHMENT_FILE_BYTES + 1 },
      ],
    }));
    expect(result.assets.map((asset) => asset.uri)).toEqual(['file:///a.jpg']);
    expect(result.oversizedCount).toBe(1);
  });
});

describe('chat attachment sheet', () => {
  const sheet = readFileSync('src/components/chat/ChatAttachmentPickerSheet.tsx', 'utf8');

  test('uses the system photo picker instead of reading the media library', () => {
    expect(sheet).not.toContain('expo-media-library');
    expect(sheet).toContain('ImagePicker.launchImageLibraryAsync');
    expect(sheet).toContain('pickChatLibraryAssets(');
  });
});
