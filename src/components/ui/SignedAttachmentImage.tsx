import React from 'react';
import { Image, type ImageProps } from 'react-native';
import {
  type SignedMediaAttachment,
  type SignedMediaContext,
} from '@/features/media/signed-media-access';
import { useSignedMediaAccess } from '@/features/media/use-signed-media-access';

interface Props extends Omit<ImageProps, 'source'> {
  attachment: SignedMediaAttachment;
  context?: SignedMediaContext;
  preferThumbnail?: boolean;
}

export const SignedAttachmentImage = React.memo(function SignedAttachmentImage({
  attachment,
  context,
  preferThumbnail = false,
  onError,
  ...props
}: Props) {
  const media = useSignedMediaAccess(attachment, context);
  return (
    <Image
      {...props}
      source={{
        uri: preferThumbnail && media.attachment.thumbnail
          ? media.attachment.thumbnail
          : media.uri,
      }}
      onError={(event) => {
        media.onLoadError();
        onError?.(event);
      }}
    />
  );
});
