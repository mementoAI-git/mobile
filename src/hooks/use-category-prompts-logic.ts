import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useState, useMemo } from 'react';
import { useCategoryDetailsPrompts } from '@/hooks/queries/use-prompts';
import { useStartConversation } from '@/hooks/mutations/use-memory-mutations';
import type { IMemory, IPrompt } from '@/types';

const CATEGORY_DETAILS_META: Record<string, { title: string; subtitle: string; image: any }> = {
  career: {
    title: 'Career and ambition',
    subtitle: "The aspirations and goals you've set to achieve professional success and personal fulfillment.",
    image: require('../../assets/images/categories/career.png'),
  },
  family: {
    title: 'Family life',
    subtitle: "The bonds, traditions, and stories that define your home and heritage.",
    image: require('../../assets/images/categories/family.png'),
  },
  relationship: {
    title: 'Finding love & relationships',
    subtitle: "The people who shape your heart and the lessons learned through connection.",
    image: require('../../assets/images/categories/relationship.png'),
  },
  region: {
    title: 'Faith and religious beliefs',
    subtitle: "The aspirations and goals you've set to achieve professional success and personal fulfillment.",
    image: require('../../assets/images/categories/region.png'),
  },
  belief: {
    title: 'Worldviews & beliefs',
    subtitle: "The principles and convictions that guide your perspective on life.",
    image: require('../../assets/images/categories/belief.png'),
  },
  purpose: {
    title: 'Finding purpose',
    subtitle: "Discovering what gives your life meaning and how you contribute to the world.",
    image: require('../../assets/images/categories/purpose.png'),
  },
  'life-transition': {
    title: 'Life transitions & changes',
    subtitle: "Moments of growth, uncertainty, and reinvention. Capture how you’ve navigated turning points, new beginnings, and the lessons that shaped who you are becoming.",
    image: require('../../assets/images/categories/life-transition.png'),
  },
  wellbeing: {
    title: 'Wellbeing & daily life',
    subtitle: "Your everyday rhythms — how you care for yourself, find balance, and make sense of the world around you. Small habits, big emotions, quiet moments that define your peace.",
    image: require('../../assets/images/categories/wellbeing.png'),
  },
  identity: {
    title: 'Identity and self-discovery',
    subtitle: "Reflections on who you are, what you believe, and how you’ve evolved. Trace your values, turning points, and the personal truths that continue to guide your journey.",
    image: require('../../assets/images/categories/identify.png'),
  },
  'experience-culture': {
    title: 'Experiences & culture',
    subtitle: "Moments that connect you to the world — travels, traditions, and shared experiences that shape your perspective and deepen your sense of belonging.",
    image: require('../../assets/images/categories/experience.png'),
  },
};

export function useCategoryPromptsLogic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);

  // tab 0: Uploaded (undefined), tab 1: Answered (true), tab 2: Unanswered (false)
  const answeredParam = activeTab === 0 ? undefined : activeTab === 1;

  const { data, isLoading, refetch, isRefetching, isStale } = useCategoryDetailsPrompts(id || '', answeredParam);
  const { mutate: start, isPending } = useStartConversation();

  const prompts = data?.prompts ?? [];
  const totalDocs = data?.totalDocs ?? 0;

  const categoryMeta = useMemo(() => {
    const slugKey = String(id || '').toLowerCase();
    return CATEGORY_DETAILS_META[slugKey] || {
      title: String(id || '').replace(/-/g, ' '),
      subtitle: 'Explore prompts in this category',
      image: null,
    };
  }, [id]);

  const handlePromptPress = useCallback((prompt: IPrompt) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/chat/[id]',
      // promptTitle is passed so the chat screen can display the question card
      // immediately — before the async useMemoryByPrompt query resolves.
      // promptLabel: id is the category slug (e.g. 'career', 'life-transition')
      // chat/[id].tsx title-cases it to show "Career" / "Life Transition" instead of "Today's reflection"
      params: { id: prompt._id || '', type: 'prompt', promptTitle: prompt.title || '', promptLabel: id || '' },
    });
  }, [id, router]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    // Explore category can be opened via deep link as root screen
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/explore');
    }
  }, [router]);

  const refetchIfStale = useCallback(() => {
    if (isStale) void refetch();
  }, [isStale, refetch]);

  return {
    id,
    router,
    prompts,
    totalDocs,
    categoryMeta,
    activeTab,
    setActiveTab,
    isLoading,
    isRefetching,
    refetch,
    refetchIfStale,
    isPending,
    handlePromptPress,
    handleBack,
  };
}
