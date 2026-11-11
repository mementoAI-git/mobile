import { useQuery } from '@tanstack/react-query';
import endpoint from '@/api/endpoint';
import { post } from '@/api/mutations';
import { queryKeys } from '@/constants/query-keys';
import {
  parseFileTranscription,
  type FileTranscription,
} from '@/features/audio/transcript-player';

/**
 * Timed transcript of one uploaded audio file. The server transcribes on the
 * first request and caches the result, so this only runs for voice recordings
 * the user actually opens.
 */
export function useFileTranscription(fileId: string | null | undefined, enabled: boolean) {
  return useQuery<FileTranscription>({
    queryKey: queryKeys.fileTranscription(fileId ?? ''),
    enabled: Boolean(fileId) && enabled,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: 1,
    queryFn: async () => {
      const response = await post(endpoint.transcription, { file_id: fileId }, { timeout: 60_000 });
      const transcription = parseFileTranscription(response.data);
      if (!transcription) throw new Error('Transcription was empty');
      return transcription;
    },
  });
}
