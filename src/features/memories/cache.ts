import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';

export type MemoryInvalidationOptions = {
  memoryId?: string;
  /**
   * Also refetch every open story. For server changes (voice and chat tools)
   * that say memories changed without naming which one.
   */
  includeAllStories?: boolean;
  includeStats?: boolean;
  includeUserStats?: boolean;
  promptId?: string;
  promptText?: string;
  reflectionDayKey?: string;
};

export function getMemoryInvalidationQueryKeys({
  memoryId,
  includeAllStories = false,
  includeStats = true,
  includeUserStats = false,
  promptId,
  promptText,
  reflectionDayKey,
}: MemoryInvalidationOptions = {}): QueryKey[] {
  const keys: QueryKey[] = [
    [queryKeys.memories()[0]],
    [queryKeys.stories()[0]],
  ];

  if (includeStats) {
    keys.push(queryKeys.memoriesStats);
  }

  if (includeUserStats) {
    keys.push(queryKeys.userStats);
  }

  if (includeAllStories) {
    keys.push([queryKeys.memory('')[0]]);
  } else if (memoryId) {
    keys.push(queryKeys.memory(memoryId));
  }

  if (promptId || promptText || reflectionDayKey) {
    keys.push(
      queryKeys.dailyPrompts(),
      queryKeys.categoryDetailsPrompts(),
      queryKeys.overviewPrompts,
      queryKeys.prompts(),
    );
  }

  if (promptId) {
    keys.push(queryKeys.memoryByPrompt(promptId));
  }

  return keys;
}

export function invalidateMemoryQueries(
  queryClient: QueryClient,
  options?: MemoryInvalidationOptions,
) {
  for (const queryKey of getMemoryInvalidationQueryKeys(options)) {
    queryClient.invalidateQueries({ queryKey });
  }
}
