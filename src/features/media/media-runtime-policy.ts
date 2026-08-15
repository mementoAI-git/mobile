const REMOTE_URI = /^https?:\/\//i;
const DEVICE_LOCAL_URI = /^(file|content|ph|assets-library):\/\//i;
const IOS_APP_BUNDLE_PATH = /\.app\//i;

export function canExtractVideoThumbnail(uri: string): boolean {
  const normalized = uri.trim();
  return normalized.length > 0 && !REMOTE_URI.test(normalized) && DEVICE_LOCAL_URI.test(normalized);
}

export function canRenderAttachmentUri(uri: string): boolean {
  const normalized = uri.trim();
  if (!normalized) return false;
  if (REMOTE_URI.test(normalized)) return true;
  if (!DEVICE_LOCAL_URI.test(normalized)) return false;
  return !IOS_APP_BUNDLE_PATH.test(normalized);
}

type VideoThumbnailStrategy = 'server' | 'cache' | 'extract' | 'placeholder';

export function getVideoThumbnailStrategy({
  uri,
  thumbnailUrl,
  hasCachedThumbnail,
}: {
  uri: string;
  thumbnailUrl?: string | null;
  hasCachedThumbnail: boolean;
}): VideoThumbnailStrategy {
  if (thumbnailUrl) return 'server';
  if (hasCachedThumbnail) return 'cache';
  return canExtractVideoThumbnail(uri) ? 'extract' : 'placeholder';
}

export function shouldMountPreviewVideo({
  category,
  isActive,
  uri,
}: {
  category: string;
  isActive: boolean;
  uri: string;
}): boolean {
  return category === 'video' && isActive && canRenderAttachmentUri(uri);
}

type AttachmentPreviewKind = 'image' | 'video' | 'placeholder' | 'file';

export function getAttachmentPreviewKind({
  category,
  uri,
}: {
  category: string;
  uri: string;
}): AttachmentPreviewKind {
  if (category !== 'image' && category !== 'video') return 'file';
  if (!canRenderAttachmentUri(uri)) return 'placeholder';
  return category;
}
