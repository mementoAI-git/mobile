import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useState, useCallback } from 'react';
import { View, Text, Share, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Image } from 'expo-image';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { useQueryClient } from '@tanstack/react-query';
import Share2 from 'lucide-react-native/icons/share-2';
import Bookmark from 'lucide-react-native/icons/bookmark';
import { Button } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useBookmarkMemory } from '@/hooks/mutations/use-memory-mutations';
import { queryKeys } from '@/constants/query-keys';
import { publishedPostUrl } from '@/lib/env';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { usePromptDetails } from '@/hooks/queries/use-prompts';
import { getExploreCategoryTitle, getQuestionIdenticonUrl } from '@/features/explore/question-presentation';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PromptReflectionHeaderProps {
  title: string;
  questionId?: string;
  category?: string;
  hasHistory?: boolean;
  memoryId?: string;
  bookmarked?: boolean;
}

export function PromptReflectionHeader({ title, questionId, category, memoryId, bookmarked = false }: PromptReflectionHeaderProps) {
  const COLORS = useThemeColors();
  const [isExpanded, setIsExpanded] = useState(true);
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const bookmark = useBookmarkMemory();
  const { data: question } = usePromptDetails(questionId || '');
  const formattedCategory = getExploreCategoryTitle(question?.category || category);
  const handleToggle = useCallback(() => {
    Haptics.selectionAsync();
    if (!reducedMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(prev => !prev);
  }, [reducedMotion]);

  const handleShare = useCallback(async () => {
    if (!memoryId) return;
    try {
      await Share.share({ message: `${title}\n\n${publishedPostUrl(memoryId)}` });
    } catch {
      toast('We couldn’t share this topic. Please try again.', 'error');
    }
  }, [memoryId, title]);
  const handleBookmark = useCallback(() => {
    if (!memoryId || bookmark.isPending) return;
    bookmark.mutate({ id: memoryId, bookmarked }, {
      onSuccess: () => {
        if (questionId) {
          queryClient.setQueryData(queryKeys.memoryByPrompt(questionId), (old: any) => {
            if (!old) return old;
            return old.data ? { ...old, data: { ...old.data, bookmarked: !bookmarked } } : { ...old, bookmarked: !bookmarked };
          });
          void queryClient.invalidateQueries({ queryKey: queryKeys.memoryByPrompt(questionId) });
        }
      },
      onError: () => toast('We couldn’t update your bookmark. Please try again.', 'error'),
    });
  }, [memoryId, bookmarked, bookmark.isPending, bookmark.mutate, questionId, queryClient]);

  if (!title) return null;

  const artwork = (
    <Image
      source={{ uri: getQuestionIdenticonUrl(questionId || title) }}
      style={{ width: isExpanded ? 56 : 40, height: isExpanded ? 56 : 40, borderRadius: isExpanded ? 12 : 8, backgroundColor: COLORS.fillWeak }}
      contentFit="cover"
      accessibilityElementsHidden
    />
  );
  const actions = (
    <View className="flex-row items-center shrink-0">
      <Button variant="ghost" size="md" iconOnly className="size-11 shrink-0" disabled={!memoryId} onPress={handleShare} accessibilityLabel="Share topic">
        <Share2 size={18} color={COLORS.textWeak} />
      </Button>
      <Button variant="ghost" size="md" iconOnly className="size-11 shrink-0" disabled={!memoryId || bookmark.isPending} loading={bookmark.isPending} onPress={handleBookmark} accessibilityLabel={bookmarked ? 'Remove topic bookmark' : 'Bookmark topic'}>
        <Bookmark size={18} color={bookmarked ? COLORS.info : COLORS.textWeak} fill={bookmarked ? COLORS.info : 'none'} />
      </Button>
      <TouchableOpacity
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={isExpanded ? 'Collapse topic card' : 'Expand topic card'}
        className="size-11 rounded-full items-center justify-center bg-fill-weaker"
      >
        {isExpanded ? <ChevronUp size={18} color={COLORS.textWeak} /> : <ChevronDown size={18} color={COLORS.textWeak} />}
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      className="rounded-[24px] border border-stroke-weak bg-fill-weaker p-4 mt-1 mb-3 min-h-11"
      accessibilityLabel="Topic question"
    >
      {isExpanded ? (
        <View className="gap-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="self-start shrink rounded-lg bg-brand/5 px-2.5 py-1.5">
              <Text className="text-brand" style={TYPE.label}>{formattedCategory}</Text>
            </View>
            {actions}
          </View>
          <View className="flex-row items-start gap-4">
            <Text className="flex-1 text-text-strong" style={TYPE.cardTitle}>{title}</Text>
            {artwork}
          </View>
        </View>
      ) : (
        <View className="flex-row items-center gap-3">
          {artwork}
          <Text numberOfLines={1} className="flex-1 text-text-strong" style={TYPE.cardTitle}>{title}</Text>
          {actions}
        </View>
      )}
    </View>
  );
}
