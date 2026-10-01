import type { ImageContentFit } from 'expo-image';

/** React Native Image resize modes the app uses, mapped to expo-image's contentFit. */
export type ImageResizeMode = 'cover' | 'contain' | 'stretch' | 'center';

const CONTENT_FIT: Record<ImageResizeMode, ImageContentFit> = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'none',
};

export function contentFitFor(resizeMode: ImageResizeMode | undefined): ImageContentFit {
  return CONTENT_FIT[resizeMode ?? 'cover'];
}
