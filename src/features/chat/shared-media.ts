import { getMediaCategory, inferMediaMimeType } from '@/features/media/media-type';
import type { PreviewAttachment } from '@/components/ui/MediaPreviewModal';
import type { SignedMediaAccessMetadata } from '@/features/media/signed-media-access';

interface SharedMediaMessage {
  _id?: string;
  text?: string;
  content?: string;
  attachments?: Array<{ _id?: string; url: string; name: string; type?: string; thumbnail?: string | null; access?: SignedMediaAccessMetadata }>;
  attatchments?: Array<{ _id?: string; url: string; name: string; type?: string; thumbnail?: string | null; access?: SignedMediaAccessMetadata }>;
}

export type SharedAttachment = PreviewAttachment & {
  category: ReturnType<typeof getMediaCategory>;
};

export interface SharedLink {
  clientId: string;
  sourceMessageId?: string;
  url: string;
}

export function mapAttachmentsToShared(
  items: Array<{
    _id?: string;
    url?: string;
    uri?: string;
    name?: string;
    type?: string;
    mimeType?: string;
    thumbnail?: string | null;
    duration?: number;
    isVoice?: boolean;
    sourceMessageId?: string;
    access?: SignedMediaAccessMetadata;
  }>
): SharedAttachment[] {
  return items.map((item) => {
    const rawType = item.type || item.mimeType || '';
    const rawName = item.name || '';
    const rawUrl = item.url || item.uri || '';
    const mimeType = inferMediaMimeType({ mimeType: rawType, name: rawName, uri: rawUrl });
    const identity = item._id || rawUrl;
    
    return {
      category: getMediaCategory({ mimeType, name: rawName, uri: rawUrl }),
      clientId: identity,
      persistedFileId: item._id,
      sourceMessageId: item.sourceMessageId,
      uri: rawUrl,
      name: rawName,
      mimeType,
      thumbnailUrl: item.thumbnail || null,
      duration: item.duration,
      isVoice: item.isVoice,
      access: item.access,
    };
  });
}

export function getAuthoritativeFileIds(
  attachments?: Array<string | { _id?: string; id?: string }>,
): ReadonlySet<string> | undefined {
  const ids = (attachments ?? [])
    .map((attachment) => typeof attachment === 'string' ? attachment : attachment._id ?? attachment.id)
    .filter((id): id is string => Boolean(id));
  return ids.length > 0 ? new Set(ids) : undefined;
}

export function collectSharedAttachments(
  pages: Array<{ messages?: SharedMediaMessage[] }>,
  authoritativeFileIds?: ReadonlySet<string>,
): SharedAttachment[] {
  const seen = new Set<string>();
  const attachments: SharedAttachment[] = [];
  for (const page of pages) {
    for (const message of [...(page.messages ?? [])].reverse()) {
      const messageAttachments = message.attachments ?? message.attatchments ?? [];
      for (const attachment of [...messageAttachments].reverse()) {
        const mimeType = inferMediaMimeType({ mimeType: attachment.type, name: attachment.name, uri: attachment.url });
        const identity = attachment._id ?? attachment.url;
        if (authoritativeFileIds && attachment._id && !authoritativeFileIds.has(attachment._id)) continue;
        if (!attachment.url || seen.has(identity)) continue;
        seen.add(identity);
        attachments.push({
          category: getMediaCategory({ mimeType, name: attachment.name, uri: attachment.url }),
          clientId: identity,
          persistedFileId: attachment._id,
          sourceMessageId: message._id,
          uri: attachment.url,
          name: attachment.name,
          mimeType,
          thumbnailUrl: attachment.thumbnail ?? null,
          access: attachment.access,
        });
      }
    }
  }
  return attachments;
}

export function collectSharedLinks(pages: Array<{ messages?: SharedMediaMessage[] }>): SharedLink[] {
  const seen = new Set<string>();
  const links: SharedLink[] = [];
  for (const page of pages) {
    for (const message of [...(page.messages ?? [])].reverse()) {
      const text = message.text ?? message.content ?? '';
      const urls = text.match(/https?:\/\/[^\s<>]+/gi) ?? [];
      urls.forEach((rawUrl, index) => {
        const url = rawUrl.replace(/[),.!?;:]+$/, '');
        if (seen.has(url)) return;
        seen.add(url);
        links.push({ clientId: `${message._id ?? 'message'}-link-${index}`, sourceMessageId: message._id, url });
      });
    }
  }
  return links;
}

export function collectSharedMedia(
  pages: Array<{ messages?: SharedMediaMessage[] }>,
  authoritativeFileIds?: ReadonlySet<string>,
): PreviewAttachment[] {
  return collectSharedAttachments(pages, authoritativeFileIds)
    .filter(({ category }) => category === 'image' || category === 'video');
}

export function findFocusedMessageIndex(messages: Array<{ _id?: string }>, messageId?: string | null) {
  if (!messageId) return -1;
  return messages.findIndex((message) => message._id === messageId);
}
