import { useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { useToast } from '@/components/ui/Toast';
import {
  getDocumentUploadInput,
  getUploadedFileFromResponse,
  isFileTooLarge,
} from '@/features/media/attachments';
import { useFileUpload as useFileUploadMutation } from '@/hooks/mutations/use-file-upload';
import { logger } from '@/lib/logger';
import type { IFile } from '@/types';

const LEGACY_MAX_FILE_MB = 120;
const LEGACY_MAX_FILE_BYTES = LEGACY_MAX_FILE_MB * 1024 * 1024;

export function useFileUpload() {
  const { toast } = useToast();
  const { mutateAsync: uploadFileMutation, isPending: isUploading } = useFileUploadMutation();

  const uploadFile = useCallback(async (fileUri: string, mimeType: string, fileName: string) => {
    try {
      const uploadResult = await uploadFileMutation({
        uri: fileUri,
        type: mimeType,
        name: fileName,
      });

      const file = getUploadedFileFromResponse<IFile>(uploadResult);
      if (file) {
        return file;
      }

      throw new Error('Upload failed');
    } catch (error) {
      logger.error('File upload error:', error);
      toast('Failed to upload file', 'error');
      return null;
    }
  }, [toast, uploadFileMutation]);

  const pickAndUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const file = result.assets[0];
      const upload = getDocumentUploadInput(file);

      if (isFileTooLarge(upload.fileSize, LEGACY_MAX_FILE_BYTES)) {
        toast(`File size exceeds ${LEGACY_MAX_FILE_MB}MB limit`, 'error');
        return null;
      }

      const uploadResult = await uploadFile(upload.uri, upload.mimeType, upload.name);

      if (uploadResult) {
        toast('File uploaded successfully', 'success');
        return uploadResult;
      }
      
      return null;
    } catch (error) {
      logger.error('Error picking document:', error);
      toast('Failed to select file', 'error');
      return null;
    }
  }, [toast, uploadFile]);

  return {
    pickAndUpload,
    isUploading,
    uploadFile,
  };
}
