import React from 'react';
import type { StyleProp, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import {
  type SignedMediaAttachment,
  type SignedMediaContext,
} from '@/features/media/signed-media-access';
import { useSignedMediaAccess } from '@/features/media/use-signed-media-access';
import { contentFitFor, type ImageResizeMode } from '@/features/media/image-fit';

// Lets callers style the image with Tailwind `className`, as they did with
// React Native's Image.
cssInterop(Image, { className: 'style' });

interface Props {
  attachment: SignedMediaAttachment;
  context?: SignedMediaContext;
  preferThumbnail?: boolean;
  style?: StyleProp<ImageStyle>;
  className?: string;
  resizeMode?: ImageResizeMode;
  accessibilityLabel?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Photos and attachments from the API. Uses expo-image, which decodes each
 * image at the size it is shown rather than at full resolution, keeps a disk
 * cache, and lets iOS evict its memory cache under pressure.
 */
export const SignedAttachmentImage = React.memo(function SignedAttachmentImage({
  attachment,
  context,
  preferThumbnail = false,
  resizeMode,
  onLoad,
  onError,
  ...props
}: Props) {
  const media = useSignedMediaAccess(attachment, context);
  const uri =
    preferThumbnail && media.attachment.thumbnail ? media.attachment.thumbnail : media.uri;
  return (
    <Image
      {...props}
      source={{ uri }}
      contentFit={contentFitFor(resizeMode)}
      recyclingKey={uri}
      cachePolicy="disk"
      onLoad={() => onLoad?.()}
      onError={() => {
        media.onLoadError();
        onError?.();
      }}
    />
  );
});
