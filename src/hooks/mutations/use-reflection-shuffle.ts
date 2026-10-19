import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { toast } from '@/components/ui/Toast';
import { reflectionShuffleKey, type ReflectionShuffleUsage } from '@/features/prompts/daily-reflections';

export function useReflectionShuffle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: reflectionShuffleKey,
    mutationFn: async () => (await post<ReflectionShuffleUsage>(`${endpoint.prompts}/shuffle`, {})).data,
    onSuccess: (usage) => queryClient.setQueryData(reflectionShuffleKey, usage),
    onError: () => {
      toast('We couldn’t shuffle your reflections. Please try again.', 'error');
      void queryClient.invalidateQueries({ queryKey: reflectionShuffleKey });
    },
  });
}
