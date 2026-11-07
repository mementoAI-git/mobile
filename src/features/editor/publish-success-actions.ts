import { logger } from '@/lib/logger';

export type StorySharePlatform = 'linkedin' | 'facebook' | 'instagram' | 'x';

interface PublishSuccessDependencies {
  copyText: (text: string) => Promise<unknown>;
  openURL: (url: string) => Promise<unknown>;
  notifyError: (message: string) => void;
}

/** Keep copy/share failures on the same notification path as the rest of the app. */
export function createPublishSuccessActions({ copyText, openURL, notifyError }: PublishSuccessDependencies) {
  return {
    async copy(publishedUrl: string): Promise<boolean> {
      try {
        await copyText(publishedUrl);
        return true;
      } catch (error) {
        logger.handledError('Could not copy published story link', error);
        notifyError('We couldn’t copy the link. Please try again.');
        return false;
      }
    },
    async share(platform: StorySharePlatform, publishedUrl: string): Promise<boolean> {
      const url = encodeURIComponent(publishedUrl);
      const links: Record<StorySharePlatform, string> = {
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        instagram: 'https://www.instagram.com/',
        x: `https://x.com/intent/tweet?url=${url}`,
      };
      try {
        await openURL(links[platform]);
        return true;
      } catch (error) {
        logger.handledError('Could not open published story share link', error);
        notifyError('We couldn’t open the sharing app. Please try again.');
        return false;
      }
    },
  };
}
