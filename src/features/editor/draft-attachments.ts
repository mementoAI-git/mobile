import type { UploadAttachment } from '@/features/media/attachment-upload-state';
import type { StoryDraftAttachment } from '@/features/drafts/story-drafts';

/** Pending media stays in the device draft until it can be uploaded again. */
export function toStoryDraftAttachments(attachments: UploadAttachment<{ _id?: string; url?: string }>[]): StoryDraftAttachment[] {
  return attachments.map(attachment => ({
    fileId: attachment.fileId || '', clientId: attachment.clientId,
    uri: attachment.file?.url || attachment.uri, name: attachment.name,
    mimeType: attachment.mimeType, isVoice: attachment.isVoice, duration: attachment.duration,
  }));
}
