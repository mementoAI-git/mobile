// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { getPickerAssetUploadUri } from './picker-assets';

describe('picker asset upload URI', () => {
  test('prefers localUri when asset info is available', async () => {
    const uploadUri = await getPickerAssetUploadUri(
      { id: 'asset-1', uri: 'ph://asset-1' },
      async () => ({ localUri: 'file:///cache/asset-1.jpg', uri: 'ph://asset-1' }),
    );

    expect(uploadUri).toBe('file:///cache/asset-1.jpg');
  });

  test('falls back to the picker asset uri when asset info rejects', async () => {
    const uploadUri = await getPickerAssetUploadUri(
      { id: 'asset-1', uri: 'content://media/asset-1' },
      async () => {
        throw new Error('Cannot access ExifInterface because of missing ACCESS_MEDIA_LOCATION permission');
      },
    );

    expect(uploadUri).toBe('content://media/asset-1');
  });
});
