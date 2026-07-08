import { useCallback, useState, type RefObject } from 'react';
import { MAX_ATTACHMENT_FILE_MB, isFileTooLarge } from '@/features/media/attachments';
import {
  type AttachmentInsertOrder,
  type AttachmentUploadInput,
  type UploadAttachment,
  type UploadedAttachmentFile,
  createUploadingAttachment,
  insertUploadingAttachment,
  markAttachmentUploaded,
  removeAttachmentByClientId,
} from '@/features/media/attachment-upload-state';

type UploadFileInput = {
  uri: string;
  type: string;
  name: string;
};

type UseAttachmentUploadsOptions<TFile extends UploadedAttachmentFile> = {
  uploadFile: (input: UploadFileInput) => Promise<TFile | null | undefined>;
  insert?: AttachmentInsertOrder;
  initialAttachments?: UploadAttachment<TFile>[];
  isMountedRef?: RefObject<boolean>;
  createClientId?: () => string;
  onFileTooLarge?: (maxFileMb: number) => void;
  onUploadFailure?: () => void;
};

function defaultCreateClientId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function isStillMounted(ref?: RefObject<boolean>) {
  return ref?.current ?? true;
}

export function useAttachmentUploads<TFile extends UploadedAttachmentFile>({
  uploadFile,
  insert = 'append',
  initialAttachments = [],
  isMountedRef,
  createClientId = defaultCreateClientId,
  onFileTooLarge,
  onUploadFailure,
}: UseAttachmentUploadsOptions<TFile>) {
  const [attachments, setAttachments] = useState<UploadAttachment<TFile>[]>(initialAttachments);

  const removeAttachment = useCallback((clientId: string) => {
    setAttachments(prev => removeAttachmentByClientId(prev, clientId));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const uploadAndAdd = useCallback(async (
    uri: string,
    mimeType: string,
    name: string,
    options: Pick<AttachmentUploadInput, 'fileSize' | 'isVoice' | 'duration'> = {},
  ): Promise<TFile | null> => {
    if (isFileTooLarge(options.fileSize)) {
      onFileTooLarge?.(MAX_ATTACHMENT_FILE_MB);
      return null;
    }

    const clientId = createClientId();
    const optimisticAttachment = createUploadingAttachment<TFile>({
      uri,
      mimeType,
      name,
      fileSize: options.fileSize,
      isVoice: options.isVoice,
      duration: options.duration,
    }, clientId);

    setAttachments(prev => insertUploadingAttachment(prev, optimisticAttachment, insert));

    try {
      const file = await uploadFile({ uri, type: mimeType, name });
      if (!isStillMounted(isMountedRef)) return null;

      if (file?._id) {
        setAttachments(prev => markAttachmentUploaded(prev, clientId, file));
        return file;
      }

      setAttachments(prev => removeAttachmentByClientId(prev, clientId));
      onUploadFailure?.();
      return null;
    } catch {
      if (isStillMounted(isMountedRef)) {
        setAttachments(prev => removeAttachmentByClientId(prev, clientId));
        onUploadFailure?.();
      }
      return null;
    }
  }, [
    createClientId,
    insert,
    isMountedRef,
    onFileTooLarge,
    onUploadFailure,
    uploadFile,
  ]);

  return {
    attachments,
    setAttachments,
    uploadAndAdd,
    removeAttachment,
    clearAttachments,
  };
}
