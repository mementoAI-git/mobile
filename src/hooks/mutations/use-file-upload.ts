import { useMutation } from '@tanstack/react-query';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import type { IFile } from '@/types';

interface UploadPayload {
  uri: string;
  type: string;
  name: string;
  onProgress?: (percent: number) => void;
}

export function useFileUpload() {
  return useMutation({
    mutationFn: async ({ uri, type, name, onProgress }: UploadPayload): Promise<IFile> => {
      const formData = new FormData();
      formData.append('file', { uri, type, name } as any);

      const response = await client.post<{ data: IFile }>(endpoint.upload, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });

      return response.data.data;
    },
  });
}
