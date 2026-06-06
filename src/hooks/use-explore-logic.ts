import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePromptCategories, useDailyPrompts } from '@/hooks/queries/use-prompts';
import { useStartConversation } from '@/hooks/mutations/use-memory-mutations';
import { useCallback, useMemo } from 'react';
import type { IMemory, IPrompt } from '@/types';

const STATIC_CATEGORIES = [
  { _id: 'career', slug: 'career', name: 'Career & Ambition' },
  { _id: 'family', slug: 'family', name: 'Family Life' },
  { _id: 'relationship', slug: 'relationship', name: 'Love & Relationships' },
  { _id: 'belief', slug: 'belief', name: 'Worldviews & Beliefs' },
  { _id: 'purpose', slug: 'purpose', name: 'Finding Purpose' },
  { _id: 'life-transition', slug: 'life-transition', name: 'Life Transitions' },
  { _id: 'wellbeing', slug: 'wellbeing', name: 'Wellbeing & Daily Life' },
  { _id: 'identity', slug: 'identity', name: 'Identity & Self-Discovery' },
];

export function useExploreLogic() {
  const router = useRouter();
  const { data: categories, isLoading: categoriesLoading, refetch, isRefetching } = usePromptCategories();
  const { data: slots, isLoading: promptsLoading } = useDailyPrompts();
  const { mutate: startConversation, isPending: isStartingConversation } = useStartConversation();

  const staticPrompts = useMemo(() => {
    return (slots ?? [])
      .filter((row) => row.slot_kind === 'static')
      .map((row) => row.prompt)
      .filter((p) => Boolean(p?._id));
  }, [slots]);

  const handleOpenCategory = useCallback((id: string) => {
    Haptics.selectionAsync();
    router.push({
      pathname: '/(tabs)/explore/[id]',
      params: { id },
    });
  }, [router]);

  const handlePromptPress = useCallback((prompt: IPrompt) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/chat/[id]',
      params: { id: prompt._id || '', type: 'prompt', promptTitle: prompt.title || '' },
    });
  }, [router]);

  const handleBackToOverview = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/overview');
  }, [router]);

  const displayCategories = useMemo(
    () => categories && (categories as any[]).length > 0 ? categories : STATIC_CATEGORIES,
    [categories],
  );

  return {
    router,
    categories: displayCategories,
    staticPrompts,
    isLoading: (categoriesLoading && (!categories || (categories as any[]).length === 0)) || promptsLoading,
    isStartingConversation,
    refetch,
    isRefetching,
    handleOpenCategory,
    handlePromptPress,
    handleBackToOverview,
  };
}
