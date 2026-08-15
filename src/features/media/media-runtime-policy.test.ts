import { describe, expect, test } from 'bun:test';
import {
  canExtractVideoThumbnail,
  canRenderAttachmentUri,
  getAttachmentPreviewKind,
  getVideoThumbnailStrategy,
  shouldMountPreviewVideo,
} from './media-runtime-policy';

describe('media runtime policy', () => {
  test('never extracts thumbnails from remote videos on the device', () => {
    expect(canExtractVideoThumbnail('https://dev.mymemento.io/video.mp4')).toBe(false);
    expect(canExtractVideoThumbnail('http://localhost/video.mov')).toBe(false);
  });

  test('allows thumbnail extraction for device-local video sources', () => {
    expect(canExtractVideoThumbnail('file:///private/var/mobile/Containers/Data/video.mp4')).toBe(true);
    expect(canExtractVideoThumbnail('content://media/external/video/42')).toBe(true);
    expect(canExtractVideoThumbnail('ph://asset-id')).toBe(true);
  });

  test('rejects stale attachment paths inside an installed iOS app bundle', () => {
    expect(canRenderAttachmentUri(
      'file:///private/var/Containers/Bundle/Application/UUID/Memento.app/missing.png',
    )).toBe(false);
  });

  test('keeps remote and durable device-local attachment sources renderable', () => {
    expect(canRenderAttachmentUri('https://dev.mymemento.io/image.jpg')).toBe(true);
    expect(canRenderAttachmentUri('file:///private/var/mobile/Containers/Data/image.jpg')).toBe(true);
    expect(canRenderAttachmentUri('content://media/external/images/42')).toBe(true);
    expect(canRenderAttachmentUri('')).toBe(false);
    expect(canRenderAttachmentUri('missing-relative-image.png')).toBe(false);
  });

  test('selects a lightweight placeholder when a remote video has no server thumbnail', () => {
    expect(getVideoThumbnailStrategy({
      uri: 'https://dev.mymemento.io/video.mp4',
      thumbnailUrl: null,
      hasCachedThumbnail: false,
    })).toBe('placeholder');
    expect(getVideoThumbnailStrategy({
      uri: 'https://dev.mymemento.io/video.mp4',
      thumbnailUrl: 'https://dev.mymemento.io/video-thumb.jpg',
      hasCachedThumbnail: false,
    })).toBe('server');
  });

  test('extracts only uncached device-local videos', () => {
    expect(getVideoThumbnailStrategy({
      uri: 'file:///private/var/mobile/Containers/Data/video.mp4',
      thumbnailUrl: null,
      hasCachedThumbnail: false,
    })).toBe('extract');
    expect(getVideoThumbnailStrategy({
      uri: 'file:///private/var/mobile/Containers/Data/video.mp4',
      thumbnailUrl: null,
      hasCachedThumbnail: true,
    })).toBe('cache');
  });

  test('mounts a native preview video player only for the active slide', () => {
    expect(shouldMountPreviewVideo({
      category: 'video', isActive: true, uri: 'https://dev.mymemento.io/video.mp4',
    })).toBe(true);
    expect(shouldMountPreviewVideo({
      category: 'video', isActive: false, uri: 'https://dev.mymemento.io/video.mp4',
    })).toBe(false);
    expect(shouldMountPreviewVideo({
      category: 'image', isActive: true, uri: 'https://dev.mymemento.io/image.jpg',
    })).toBe(false);
    expect(shouldMountPreviewVideo({
      category: 'video',
      isActive: true,
      uri: 'file:///private/var/Containers/Bundle/Application/UUID/Memento.app/missing.mp4',
    })).toBe(false);
  });

  test('turns stale chat media into a placeholder before native rendering', () => {
    const staleImage = 'file:///private/var/Containers/Bundle/Application/UUID/Memento.app/missing.png';
    expect(getAttachmentPreviewKind({ category: 'image', uri: staleImage })).toBe('placeholder');
    expect(getAttachmentPreviewKind({
      category: 'image', uri: 'https://dev.mymemento.io/image.jpg',
    })).toBe('image');
    expect(getAttachmentPreviewKind({
      category: 'video', uri: 'https://dev.mymemento.io/video.mp4',
    })).toBe('video');
    expect(getAttachmentPreviewKind({
      category: 'document', uri: 'https://dev.mymemento.io/file.pdf',
    })).toBe('file');
  });
});
