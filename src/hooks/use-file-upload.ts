import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { useToast } from '@/components/ui/Toast';

const MAX_FILE_SIZE = 120 * 1024 * 1024; // 120MB

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = useCallback(async (fileUri: string, mimeType: string, fileName: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: fileName,
      } as any);

      const response = await post(endpoint.upload, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data) {
        return response.data;
      }
      throw new Error('Upload failed');
    } catch (error) {
      console.error('File upload error:', error);
      toast('Failed to upload file', 'error');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

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
      
      if (file.size && file.size > MAX_FILE_SIZE) {
        toast('File size exceeds 120MB limit', 'error');
        return null;
      }

      const mimeType = file.mimeType || 'application/octet-stream';
      
      const uploadResult = await uploadFile(file.uri, mimeType, file.name);
      
      if (uploadResult) {
        toast('File uploaded successfully', 'success');
        return uploadResult;
      }
      
      return null;
    } catch (error) {
      console.error('Error picking document:', error);
      toast('Failed to select file', 'error');
      return null;
    }
  }, [uploadFile]);

  return {
    pickAndUpload,
    isUploading,
    uploadFile,
  };
}
