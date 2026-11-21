import { getMediaUploadInput, isFileTooLarge } from './attachments';
import { inferMediaMimeType } from './media-type';

/**
 * Chat attachments chosen in the system photo picker.
 *
 * Memento never reads the whole photo library: the Android Photo Picker (and
 * iOS PHPicker) hand back only what the person picked, so the app needs no
 * READ_MEDIA_IMAGES / READ_MEDIA_VIDEO permission (Google Play photo and video
 * permissions policy).
 */
export type ChatPickerAsset = {
  id: string;
  uri: string;
  uploadUri: string;
  name: string;
  mimeType: string;
  mediaType: 'photo' | 'video' | 'audio';
  /** Seconds. */
  duration?: number;
  fileSize?: number;
};

/** `media` is photos and videos together; `videos` is videos only. */
export type ChatLibraryPick = 'media' | 'videos';

/** The fields of an expo-image-picker `ImagePickerAsset` this flow reads. */
export type SystemPickerAsset = {
  uri: string;
  assetId?: string | null;
  type?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  /** Milliseconds, as expo-image-picker reports it. */
  duration?: number | null;
};

export type SystemPickerResult =
  | { canceled: true; assets?: null }
  | { canceled: false; assets: SystemPickerAsset[] };

export type SystemPickerOptions = {
  mediaTypes: ('images' | 'videos')[];
  allowsMultipleSelection: true;
  quality: number;
};

export function getSystemPickerOptions(kind: ChatLibraryPick): SystemPickerOptions {
  return {
    mediaTypes: kind === 'videos' ? ['videos'] : ['images', 'videos'],
    allowsMultipleSelection: true,
    quality: 0.85,
  };
}

export function toChatPickerAsset(
  asset: SystemPickerAsset,
  timestamp = Date.now(),
): ChatPickerAsset {
  const inferred = inferMediaMimeType({
    mimeType: asset.mimeType ?? undefined,
    name: asset.fileName ?? undefined,
    uri: asset.uri,
  });
  const fallbackMime = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
  const mimeType = inferred.startsWith('image/') || inferred.startsWith('video/') ? inferred : fallbackMime;
  const upload = getMediaUploadInput({ ...asset, mimeType }, timestamp);

  return {
    id: asset.assetId || upload.uri,
    uri: upload.uri,
    uploadUri: upload.uri,
    name: upload.name,
    mimeType: upload.mimeType,
    mediaType: upload.mimeType.startsWith('video/') ? 'video' : 'photo',
    duration: typeof asset.duration === 'number' ? asset.duration / 1000 : undefined,
    fileSize: upload.fileSize,
  };
}

/**
 * Opens the system photo picker and returns the picked items ready for upload.
 * Items over the attachment size limit are left out and counted, so the caller
 * can say so.
 */
export async function pickChatLibraryAssets(
  kind: ChatLibraryPick,
  launch: (options: SystemPickerOptions) => Promise<SystemPickerResult>,
  timestamp = Date.now(),
): Promise<{ assets: ChatPickerAsset[]; oversizedCount: number }> {
  const result = await launch(getSystemPickerOptions(kind));
  if (result.canceled || !result.assets?.length) return { assets: [], oversizedCount: 0 };

  const picked = result.assets.map((asset) => toChatPickerAsset(asset, timestamp));
  const assets = picked.filter((asset) => !isFileTooLarge(asset.fileSize));
  return { assets, oversizedCount: picked.length - assets.length };
}
