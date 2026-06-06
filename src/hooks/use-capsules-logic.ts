import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/store';
import { useCapsules, useCapsuleStats } from '@/hooks/queries/use-capsules';
import { useSubscription } from '@/hooks/queries/use-subscription';

export function useCapsulesLogic() {
  const openSheet = useUiStore((s) => s.openSheet);
  const [filter, setFilter] = useState('');

  const { data: statsData } = useCapsuleStats();
  const { isProOrAbove, usage } = useSubscription();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useCapsules(filter || undefined);

  const capsules = useMemo(() => data?.pages.flatMap((p) => p.docs) ?? [], [data?.pages]);
  const stats = statsData;

  const timedCount = usage?.timed_message_count ?? 0;
  const atTimedMessageLimit = !isProOrAbove && timedCount >= 5;

  const handleCreateNew = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (atTimedMessageLimit) {
      openSheet('upgrade-prompt');
      return;
    }
    openSheet('create-capsule');
  }, [atTimedMessageLimit, openSheet]);

  const handleClearFilter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter('');
  }, []);

  return {
    openSheet,
    filter,
    setFilter,
    stats,
    capsules,
    isLoading,
    isRefetching,
    refetch,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    handleCreateNew,
    handleClearFilter,
  };
}
