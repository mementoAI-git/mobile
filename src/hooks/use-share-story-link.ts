import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { put } from '@/api/mutations';
import { fetchEntity } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { toast } from '@/components/ui/Toast';
import { queryKeys } from '@/constants/query-keys';
import { invalidateMemoryQueries } from '@/features/memories/cache';
import {
  PUBLIC_STORY_AUDIENCE,
  planStoryShare,
  type StorySharePlan,
} from '@/features/memories/share-story';
import { logger } from '@/lib/logger';
import { useUiStore } from '@/store';
import type { IMemory } from '@/types';

/**
 * Shares a story's link only once the link will open for whoever gets it.
 * A private story is made public first, after the host confirms; a draft is
 * refused. `share` copies or sends the link, and runs only when it will work.
 * Resolves to the plan it followed: on 'confirm-public' the confirmation sheet
 * has replaced the caller's sheet, so the caller must not close it.
 */
export function useShareStoryLink() {
  const queryClient = useQueryClient();

  return useCallback(
    async (memoryId: string, share: () => Promise<void> | void): Promise<StorySharePlan> => {
      let memory: IMemory | null = null;
      try {
        // Fresh, not cached: who can see the story may have just changed.
        memory = await queryClient.fetchQuery({
          queryKey: queryKeys.memory(memoryId),
          queryFn: () => fetchEntity<IMemory>(endpoint.memory.replace(':id', memoryId)),
          staleTime: 0,
        });
      } catch (error) {
        logger.handledError('Could not load story before sharing', error);
      }

      const plan = planStoryShare(memory);
      if (plan === 'unavailable') {
        toast('We couldn’t share this story. Please try again.', 'error');
        return plan;
      }
      if (plan === 'publish-first') {
        toast('Publish this story before sharing it. Until then, only you can open the link.', 'error');
        return plan;
      }
      if (plan === 'share') {
        await share();
        return plan;
      }

      useUiStore.getState().openSheet('security-confirmation', {
        kind: 'make-story-public',
        onConfirm: async () => {
          try {
            await put(endpoint.memory.replace(':id', memoryId), PUBLIC_STORY_AUDIENCE);
          } catch (error) {
            logger.handledError('Could not make story public', error);
            toast('We couldn’t make this story public. Please try again.', 'error');
            // Rethrow so the confirmation stays open for another try.
            throw error;
          }
          invalidateMemoryQueries(queryClient, { memoryId });
          useUiStore.getState().closeSheet();
          await share();
        },
      });
      return plan;
    },
    [queryClient],
  );
}
