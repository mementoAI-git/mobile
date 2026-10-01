import { useQuery } from '@tanstack/react-query';
import { post } from '@/api/mutations';
import { queryKeys } from '@/constants/query-keys';
import {
  parseVoiceCallSummary,
  voiceCallSummaryPath,
  type VoiceCallSummary,
} from '@/features/chat/voice-call-records';

/**
 * Summary of one voice call. The server generates and saves it on the first
 * request, so this only runs once the user opens the Summary row.
 */
export function useVoiceCallSummary(sessionId: string | null | undefined, enabled: boolean) {
  return useQuery<VoiceCallSummary>({
    queryKey: queryKeys.voiceCallSummary(sessionId ?? ''),
    enabled: Boolean(sessionId) && enabled,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: 1,
    queryFn: async () => {
      const response = await post(voiceCallSummaryPath(sessionId as string), {}, { timeout: 60_000 });
      const summary = parseVoiceCallSummary(response.data);
      if (!summary) throw new Error('Voice call summary was empty');
      return summary;
    },
  });
}
