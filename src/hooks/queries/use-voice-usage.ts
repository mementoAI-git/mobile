import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import { queryKeys } from '@/constants/query-keys';
import { deviceTimeZone } from '@/features/chat/voice-token-url';
import { VOICE_USAGE_PATH, parseVoiceUsage, type VoiceUsage } from '@/features/chat/voice-usage';

/** Voice minutes this month (in the member's time zone) and all time, for the Insights cards. */
export function useVoiceUsage() {
  return useQuery<VoiceUsage>({
    queryKey: queryKeys.voiceUsage,
    staleTime: 30_000,
    queryFn: async () => {
      const timezone = deviceTimeZone();
      const response = await get(VOICE_USAGE_PATH, { params: timezone ? { timezone } : undefined });
      const usage = parseVoiceUsage(response.data);
      if (!usage) throw new Error('Voice usage was empty');
      return usage;
    },
  });
}
