import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { Badge, Button } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { useUiStore } from '@/store';
import { useExploreFeedback } from '@/hooks/mutations/use-explore-feedback';
import { getQuestionIdenticonUrl, getQuestionSourceLabel } from '@/features/explore/question-presentation';
import * as Haptics from 'expo-haptics';
import type { IPrompt } from '@/types';
import Animated, { useSharedValue, useAnimatedStyle, useReducedMotion, withSpring } from 'react-native-reanimated';

export const ExploreQuestionCard = React.memo(function ExploreQuestionCard({ prompt, onPress }: {
  prompt: IPrompt;
  onPress: (prompt: IPrompt) => void;
}) {
  const COLORS = useThemeColors();
  const feedback = useExploreFeedback();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = useCallback(() => {
    if (!reducedMotion) scale.value = withSpring(0.97);
  }, [reducedMotion, scale]);
  const handlePressOut = useCallback(() => { scale.value = withSpring(1); }, [scale]);
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(prompt);
  }, [prompt, onPress]);
  const handleFeedback = useCallback(() => {
    if (!prompt._id || feedback.isPending) return;
    feedback.mutate({ questionId: prompt._id, status: 'not-relevant' });
  }, [prompt._id, feedback.isPending, feedback.mutate]);
  const handleOptions = useCallback(() => {
    useUiStore.getState().openSheet('select', {
      placeholder: 'Topic options',
      options: [{ label: 'Not relevant to me', value: 'not-relevant' }],
      onValueChange: handleFeedback,
    });
  }, [handleFeedback]);

  return (
    <Animated.View style={animStyle} className="rounded-[24px] border border-stroke-weak bg-fill-weaker p-4 flex-row items-start gap-3">
      <TouchableOpacity
        className="flex-1 flex-row items-start gap-3 min-h-11"
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!prompt._id}
        accessibilityRole="button"
        accessibilityLabel={`Reflect on: ${prompt.title}`}
        activeOpacity={0.9}
      >
        <Image source={{ uri: getQuestionIdenticonUrl(prompt._id || prompt.title) }} style={{ width: 72, height: 80, borderRadius: 12, backgroundColor: COLORS.fillWeak }} contentFit="cover" accessibilityElementsHidden />
        <View className="flex-1 gap-4">
          <Text className="text-text-strong" style={TYPE.cardTitle}>{prompt.title}</Text>
          <Badge variant="outline" label={getQuestionSourceLabel(prompt.source)} />
        </View>
      </TouchableOpacity>
      <Button variant="ghost" size="md" iconOnly className="size-11 shrink-0" onPress={handleOptions} disabled={!prompt._id || feedback.isPending} loading={feedback.isPending} accessibilityLabel={`Topic options: ${prompt.title}`}>
        <Ellipsis size={20} color={COLORS.textWeak} />
      </Button>
    </Animated.View>
  );
});
