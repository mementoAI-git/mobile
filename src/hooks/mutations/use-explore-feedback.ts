import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@/api/mutations';
import { queryKeys } from '@/constants/query-keys';
import { getQuestionFeedbackRequest } from '@/features/explore/question-presentation';
import { toast } from '@/components/ui/Toast';

export function useExploreFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, status }: { questionId: string; status: 'skipped' | 'not-relevant' }) => {
      const request = getQuestionFeedbackRequest(questionId, status);
      return post(request.url, request.body);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.categoryDetailsPrompts() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.overviewPrompts }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dailyPrompts() }),
      ]);
      toast('We’ll avoid questions like this', 'success');
    },
    onError: () => {
      toast('We couldn’t save that preference. Please try again.', 'error');
    },
  });
}
