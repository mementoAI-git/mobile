import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Mic, CheckCircle2, Square, MessageSquareText, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDailyPrompts } from '@/hooks/queries/use-prompts';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { type PermissionLike } from '@/lib/permission-recovery';
import { toast } from '@/components/ui/Toast';
import {
  formatRecordingDuration,
  buildPromptAudioReflectionTarget,
} from '@/features/prompts/prompt-audio-capture';
import type { IDashboardPromptSlot } from '@/types';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

export function DailyPromptSection() {
  const { data: dailyPrompts, isLoading } = useDailyPrompts();
  const prompts = dailyPrompts || [];
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFinishingAudio, setIsFinishingAudio] = useState(false);

  const handleMicrophonePermissionDenied = useCallback((permission: PermissionLike) => {
    showPermissionRecoveryAlert({
      permission,
      title: 'Microphone is off',
      description: 'Allow microphone access to record your voice reflection.',
      settingsDescription: 'Microphone access is turned off in Settings. Turn it back on to record your voice reflection.',
    });
  }, []);

  const handleRecordingError = useCallback((err: unknown) => {
    toast('Could not start recording. Opening reflection chat…', 'info');
  }, []);

  const { start: startRecording, stop: stopRecording, isRecording, duration } = useAudioRecorder({
    onPermissionDenied: handleMicrophonePermissionDenied,
    onError: handleRecordingError,
  });

  useEffect(() => {
    if (prompts.length > 0 && activeIndex >= prompts.length) {
      setActiveIndex(0);
    }
  }, [prompts.length, activeIndex]);

  const activeRow = prompts[activeIndex];
  const promptText = activeRow?.slot_kind === 'ai' ? activeRow.ai_prompt_text : activeRow?.prompt?.title;

  const handleCapture = useCallback(() => {
    if (!activeRow || activeRow.answered) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const target = buildPromptAudioReflectionTarget(
      activeRow.prompt?._id || 'new',
      promptText || ''
    );
    router.push(target as any);
  }, [activeRow, promptText, router]);

  const handleToggleVoice = useCallback(async () => {
    if (!activeRow || activeRow.answered || isFinishingAudio) return;

    if (isRecording) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsFinishingAudio(true);
      try {
        const audioUri = await stopRecording();
        const target = buildPromptAudioReflectionTarget(
          activeRow.prompt?._id || 'new',
          promptText || '',
          audioUri || undefined
        );
        router.push(target as any);
      } finally {
        setIsFinishingAudio(false);
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const started = await startRecording();
      if (!started) {
        // If recording couldn't start (e.g. simulator without audio input), smoothly navigate to chat
        handleCapture();
      }
    }
  }, [activeRow, handleCapture, isFinishingAudio, isRecording, promptText, router, startRecording, stopRecording]);

  const handleSelectPrompt = useCallback((index: number) => {
    Haptics.selectionAsync();
    setActiveIndex(index);
  }, []);

  if (isLoading) {
    return <Skeleton className="h-[200px] rounded-3xl" />;
  }

  if (prompts.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(200)} className="gap-4">
      <View className="flex-row items-center justify-between px-1">
        <Animated.Text
          className="text-text-strong"
          style={TYPE.uiTitle}
        >
          Continue <Animated.Text
            className="text-text-weak"
            style={{ ...TYPE.sectionTitle, fontStyle: 'italic' }}
          >
            reflecting
          </Animated.Text>
        </Animated.Text>
      </View>

      <View className="bg-white border border-stroke-weaker rounded-[32px] p-6">
        {prompts.length > 1 && (
          <View className="flex-row flex-wrap gap-2 mb-6">
            {prompts.map((p, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleSelectPrompt(i)}
                activeOpacity={0.7}
                className={`px-4 py-2 rounded-full border ${activeIndex === i ? 'bg-brand border-brand' : 'bg-fill-weaker border-stroke-weaker'
                  }`}
              >
                <Animated.Text
                  className={activeIndex === i ? 'text-white' : 'text-text-strong'}
                  style={TYPE.metadata}
                >
                  {p.display_label || `Prompt ${i + 1}`}
                </Animated.Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Animated.Text
          className="text-text-strong leading-[26px] mb-8"
          style={TYPE.cardTitle}
        >
          {promptText}
        </Animated.Text>

        {activeRow.answered ? (
          <View className="flex-row items-center gap-2">
            <CheckCircle2 size={16} color={COLORS.success} />
            <Animated.Text className="text-text-weak" style={TYPE.label}>
              You've already shared a reflection today.
            </Animated.Text>
          </View>
        ) : isRecording ? (
          <TouchableOpacity
            onPress={handleToggleVoice}
            activeOpacity={0.8}
            className="flex-row items-center justify-center gap-3 bg-text-strong rounded-full h-12 px-6 self-start"
          >
            <View className="size-3 rounded-full bg-white animate-pulse" />
            <Animated.Text className="text-white" style={TYPE.label}>
              Recording ({formatRecordingDuration(duration || 0)}) • Tap to send
            </Animated.Text>
            <Square size={14} color="white" fill="white" />
          </TouchableOpacity>
        ) : (
          // <View className="flex-row items-center gap-3">
          //   <TouchableOpacity
          //     onPress={handleToggleVoice}
          //     activeOpacity={0.8}
          //     className="flex-row items-center justify-center gap-2 bg-text-strong rounded-full h-12 px-5"
          //   >
          //     <Mic size={18} color="white" strokeWidth={2.5} />
          //     <Animated.Text className="text-white" style={TYPE.label}>
          //       Speak reflection
          //     </Animated.Text>
          //   </TouchableOpacity>

          //   <TouchableOpacity
          //     onPress={handleCapture}
          //     activeOpacity={0.7}
          //     className="flex-row items-center justify-center gap-2 bg-fill-weaker border border-stroke-weaker rounded-full h-12 px-5"
          //   >
          //     <MessageSquareText size={16} color={COLORS.textStrong} strokeWidth={2} />
          //     <Animated.Text className="text-text-strong" style={TYPE.label}>
          //       Write
          //     </Animated.Text>
          //   </TouchableOpacity>
          // </View>

          <View className="flex-row items-center gap-3">
            {/* <TouchableOpacity
              onPress={handleToggleVoice}
              activeOpacity={0.8}
              className="flex-row items-center justify-center gap-2 bg-text-strong rounded-full h-12 px-5"
            >
              <Mic size={18} color="white" strokeWidth={2.5} />
              <Animated.Text className="text-white" style={TYPE.label}>
                Reply Prompt
              </Animated.Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              onPress={handleCapture}
              activeOpacity={0.7}
              // className="flex-row items-center justify-center gap-2 bg-fill-weaker border border-stroke-weaker rounded-full h-12 px-5"
              className="flex-row items-center justify-center gap-2 bg-text-strong rounded-full h-12 px-5"
            >
              <Animated.Text className="text-white" style={TYPE.label}>
                Reply Prompt
              </Animated.Text>
              <ArrowRight size={16} color={COLORS.background} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
