import { useMutation } from '@tanstack/react-query';
import client from '@/api/client';
import { File } from 'expo-file-system';
import { buildRecordingUpload } from '@/features/editor/recording-upload';
import endpoint from '@/api/endpoint';

export function useTranscribeRecording() {
  return useMutation({
    retry: false,
    mutationFn: async ({ uri, signal }: { uri: string; signal: AbortSignal }) => {
      const file = new File(uri);
      if (file.size > 15 * 1024 * 1024) throw new Error('This recording exceeds the 15 MB transcription limit. Your audio is saved.');
      const boundary = `memento-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const form = buildRecordingUpload(await file.bytes(), boundary);
      const response = await client.post<{ success?: boolean; data?: { full_text?: string }; message?: string }>(endpoint.transcription, form, {
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        transformRequest: data => data, signal, timeout: 60000,
      }).catch((error: { message?: string }) => { throw new Error(error?.message || 'Could not reach transcription. Your recording is saved for retry.'); });
      const payload = response.data;
      if (payload?.success === false || typeof payload?.data?.full_text !== 'string') {
        throw new Error(payload?.message || 'Could not transcribe this recording. Your audio is ready to retry.');
      }
      const text = payload.data.full_text.trim();
      if (!text) throw new Error('No speech was found. Your recording is still available to retry.');
      return text;
    },
  });
}
