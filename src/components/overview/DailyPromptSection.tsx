import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, type ImageSourcePropType } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useIsMutating } from '@tanstack/react-query';
import Shuffle from 'lucide-react-native/icons/shuffle';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { TYPE } from '@/constants/typography';
import { getCategoryMeta } from '@/constants/categories';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ContinueReflectingCard } from '@/components/explore/ContinueReflectingCard';
import { useDailyPrompts } from '@/hooks/queries/use-prompts';
import { useReflectionShuffleUsage } from '@/hooks/queries/use-reflection-shuffle';
import { useReflectionShuffle } from '@/hooks/mutations/use-reflection-shuffle';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useUiStore } from '@/store';
import { useVoiceContent } from '@/features/voice-control/hooks';
import { canShuffleReflections, reflectionCapture, reflectionShuffleKey, rotateReflections } from '@/features/prompts/daily-reflections';
import { getPromptReplyCounts } from '@/features/prompts/prompt-reply-count';
import { avatarsForCard, createAvatarOrder, refreshAvatarOrder } from '@/features/prompts/reflection-avatars';
import type { IDashboardPromptSlot } from '@/types';

const DailyReflectionCard = React.memo(function DailyReflectionCard({ row, replyCount, avatars }: {
  row: IDashboardPromptSlot;
  replyCount: number;
  avatars: ImageSourcePropType[];
}) {
  const title = row.slot_kind === 'ai' ? row.ai_prompt_text : row.prompt.title;
  const category = row.slot_kind === 'static' ? getCategoryMeta(row.prompt.category) : null;
  const handlePress = useCallback(() => {
    const daily_prompt = reflectionCapture(row);
    if (daily_prompt) useUiStore.getState().openSheet('quick-capture', { daily_prompt });
  }, [row]);

  return (
    <ContinueReflectingCard
      title={title}
      categoryLabel={category?.title || row.display_label || 'Who I am'}
      personal={row.slot_kind === 'ai'}
      answered={row.answered}
      replyCount={replyCount}
      avatars={avatars}
      onPress={row.slot_kind === 'static' && !row.prompt._id ? undefined : handlePress}
    />
  );
});

export function DailyPromptSection() {
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  const { data: prompts, isLoading, error, refetch } = useDailyPrompts();
  const { data: usage, error: usageError, refetch: refreshUsage } = useReflectionShuffleUsage();
  const { mutate: shuffle } = useReflectionShuffle();
  const shuffling = useIsMutating({ mutationKey: reflectionShuffleKey }) > 0;
  const [avatarOrder, setAvatarOrder] = useState(createAvatarOrder);
  const previousUsage = useRef<string | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);
  const pressGuard = useRef(false);
  const revision = usage ? `${usage.resets_at}:${usage.used}` : 'loading';

  useFocusEffect(useCallback(() => {
    void refreshUsage();
    void refetch();
  }, [refreshUsage, refetch]));

  useEffect(() => {
    if (!usage) return;
    if (previousUsage.current && previousUsage.current !== revision) {
      setAvatarOrder(refreshAvatarOrder);
      scrollRef.current?.scrollTo({ x: 0, animated: !reducedMotion });
    }
    previousUsage.current = revision;
  }, [usage, revision, reducedMotion]);

  const cards = useMemo(() => {
    const rows = prompts ?? [];
    const counts = getPromptReplyCounts(rows);
    return rotateReflections(rows.map((row, index) => ({
      row,
      key: `${row.slot_kind}-${row.reflection_day_key}-${row.slot_kind === 'static' ? row.prompt._id : index}`,
      replyCount: counts[index],
      avatars: avatarsForCard(avatarOrder, index),
    })), usage?.used ?? 0);
  }, [prompts, usage?.used, avatarOrder]);

  const firstRow = cards[0]?.row;
  const promptText = firstRow ? (firstRow.slot_kind === 'ai' ? firstRow.ai_prompt_text : firstRow.prompt.title) : '';
  // "Read me the prompt": Memento reads what the first card shows.
  useVoiceContent("Today's prompt", () => promptText ?? '', Boolean(promptText));

  const allowed = canShuffleReflections(cards.length, usage, shuffling || isLoading);
  const handleShuffle = useCallback(() => {
    if (!allowed || pressGuard.current) return;
    pressGuard.current = true;
    shuffle(undefined, { onSettled: () => { pressGuard.current = false; } });
  }, [allowed, shuffle]);
  const retryPrompts = useCallback(() => { void refetch(); }, [refetch]);
  const retryUsage = useCallback(() => { void refreshUsage(); }, [refreshUsage]);

  return (
    <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(300)} className="gap-4">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 gap-0">
          <Text className="text-text-strong" style={TYPE.sectionTitle}>
            Continue <Text className="text-text-weak" style={TYPE.sectionTitleWeak}>reflecting</Text>
          </Text>
          {usage ? (
            <Text accessibilityLiveRegion="polite" className="text-text-weak" style={TYPE.bodySmall}>
              {usage.remaining === 0 ? 'Daily shuffle limit reached. Resets at midnight UTC.' : `${usage.remaining} ${usage.remaining === 1 ? 'shuffle' : 'shuffles'} left today`}
            </Text>
          ) : usageError ? (
            <Button variant="ghost" onPress={retryUsage}>Retry shuffle availability</Button>
          ) : <Text className="text-text-weak" style={TYPE.bodySmall}>Checking shuffle allowance…</Text>}
        </View>
        <Button variant="ghost" iconOnly size="md" accessibilityLabel="Shuffle reflections"
          disabled={!allowed} loading={shuffling} onPress={handleShuffle}>
          <Shuffle size={22} color={usage?.remaining === 0 ? colors.iconDisabled : colors.textStrong} />
        </Button>
      </View>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
        {isLoading ? (
          <View className="flex-row gap-4">
            <Skeleton className="h-[220px] w-[280px] rounded-[24px]" />
            <Skeleton className="h-[220px] w-[280px] rounded-[24px]" />
          </View>
        ) : (
          <Animated.View key={revision} entering={reducedMotion ? undefined : FadeIn.duration(200)} className="flex-row">
            {cards.map(({ key, ...props }) => <DailyReflectionCard key={key} {...props} />)}
          </Animated.View>
        )}
      </ScrollView>
      {!!error && <Button variant="outline" onPress={retryPrompts}>Retry loading reflections</Button>}
      {!error && !isLoading && cards.length === 0 && (
        <Text className="text-text-weak" style={TYPE.body}>No reflections available today. Explore more topics below.</Text>
      )}
    </Animated.View>
  );
}
