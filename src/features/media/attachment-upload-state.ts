export type UploadedAttachmentFile = {
  _id?: string;
};

export type AttachmentUploadInput = {
  uri: string;
  mimeType: string;
  name: string;
  fileSize?: number;
  isVoice?: boolean;
  duration?: number;
};

export type UploadAttachment<TFile extends UploadedAttachmentFile = UploadedAttachmentFile> = {
  clientId: string;
  fileId: string | null;
  uri: string;
  name: string;
  mimeType: string;
  isVoice?: boolean;
  duration?: number;
  isUploading: boolean;
  file?: TFile;
};

export type UploadedAttachment<TFile extends UploadedAttachmentFile = UploadedAttachmentFile> =
  UploadAttachment<TFile> & {
    fileId: string;
    isUploading: false;
  };

export type AttachmentInsertOrder = 'append' | 'prepend';

export function createUploadingAttachment<TFile extends UploadedAttachmentFile>(
  input: AttachmentUploadInput,
  clientId: string,
): UploadAttachment<TFile> {
  return {
    clientId,
    fileId: null,
    uri: input.uri,
    name: input.name,
    mimeType: input.mimeType,
    isVoice: input.isVoice,
    duration: input.duration,
    isUploading: true,
  };
}

export function insertUploadingAttachment<TAttachment>(
  attachments: TAttachment[],
  attachment: TAttachment,
  order: AttachmentInsertOrder,
): TAttachment[] {
  return order === 'prepend'
    ? [attachment, ...attachments]
    : [...attachments, attachment];
}

export function markAttachmentUploaded<
  TFile extends UploadedAttachmentFile,
  TAttachment extends UploadAttachment<TFile>,
>(
  attachments: TAttachment[],
  clientId: string,
  file: TFile,
): TAttachment[] {
  return attachments.map((attachment) => (
    attachment.clientId === clientId
      ? {
          ...attachment,
          fileId: file._id ?? null,
          isUploading: false,
          file,
        }
      : attachment
  ));
}

export function removeAttachmentByClientId<TAttachment extends { clientId: string }>(
  attachments: TAttachment[],
  clientId: string,
): TAttachment[] {
  return attachments.filter((attachment) => attachment.clientId !== clientId);
}

export function hasUploadingAttachments(attachments: UploadAttachment[]): boolean {
  return attachments.some((attachment) => attachment.isUploading);
}

export function getUploadedAttachments<TFile extends UploadedAttachmentFile>(
  attachments: UploadAttachment<TFile>[],
): UploadedAttachment<TFile>[] {
  return attachments.flatMap((attachment) => (
    attachment.fileId && !attachment.isUploading
      ? [{ ...attachment, fileId: attachment.fileId, isUploading: false }]
      : []
  ));
}

export function getUploadedAttachmentIds(attachments: UploadAttachment[]): string[] {
  return getUploadedAttachments(attachments).map((attachment) => attachment.fileId);
}
