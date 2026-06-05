import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Mic, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/store';
import { COLORS, FONTS } from '@/constants/tokens';
import { Skeleton } from '@/components/ui/Skeleton';
import type { IDashboardPromptSlot } from '@/types';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

interface Props {
  prompts: IDashboardPromptSlot[];
  isLoading: boolean;
}

export function DailyPromptSection({ prompts, isLoading }: Props) {
  const openSheet = useUiStore((s) => s.openSheet);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (prompts.length > 0 && activeIndex >= prompts.length) {
      setActiveIndex(0);
    }
  }, [prompts.length, activeIndex]);

  if (isLoading) {
    return <Skeleton className="h-[200px] rounded-3xl" />;
  }

  if (prompts.length === 0) return null;

  const activeRow = prompts[activeIndex];
  const promptText = activeRow.slot_kind === 'ai' ? activeRow.ai_prompt_text : activeRow.prompt?.title;

  const handleCapture = () => {
    if (activeRow.answered) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const payload = activeRow.slot_kind === 'ai'
      ? { pinned_text: activeRow.ai_prompt_text, prompt_type: 'ai-generated', reflection_day_key: activeRow.reflection_day_key }
      : { pinned_text: activeRow.prompt?.title, prompt_type: 'static', prompt_id: activeRow.prompt?._id, reflection_day_key: activeRow.reflection_day_key };

    openSheet('quick-capture', { daily_prompt: payload });
  };

  return (
    <Animated.View entering={FadeInDown.delay(200)} className="gap-4">
      <View className="flex-row items-center justify-between px-1">
        <Animated.Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
          Continue <Animated.Text className="text-text-weak italic">reflecting</Animated.Text>
        </Animated.Text>
      </View>

      <View className="bg-white border border-stroke-weaker rounded-[32px] p-6">
        {prompts.length > 1 && (
          <View className="flex-row flex-wrap gap-2 mb-6">
            {prompts.map((p, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveIndex(i);
                }}
                activeOpacity={0.7}
                className={`px-4 py-2 rounded-full border ${activeIndex === i ? 'bg-brand border-brand' : 'bg-fill-weaker border-stroke-weaker'
                  }`}
              >
                <Animated.Text
                  className={`text-[11px] font-bold ${activeIndex === i ? 'text-white' : 'text-text-strong'}`}
                  style={{ fontFamily: FONTS.sansBold }}
                >
                  {p.display_label || `Prompt ${i + 1}`}
                </Animated.Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Animated.Text
          className="text-lg text-text-strong leading-[26px] mb-8"
          style={{ fontFamily: FONTS.sansMedium }}
        >
          {promptText}
        </Animated.Text>

        {activeRow.answered ? (
          <View className="flex-row items-center gap-2">
            <CheckCircle2 size={16} color={COLORS.success} />
            <Animated.Text className="text-sm text-text-weak" style={{ fontFamily: FONTS.sans }}>
              You've already shared a reflection today.
            </Animated.Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleCapture}
            activeOpacity={0.8}
            className="flex-row items-center justify-center gap-2 bg-brand rounded-full h-12 px-6 self-start"
          >
            <Mic size={18} color="white" strokeWidth={2.5} />
            <Animated.Text className="text-sm font-bold text-white" style={{ fontFamily: FONTS.sansBold }}>
              Write or speak it
            </Animated.Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}
