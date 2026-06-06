import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoreVertical, ChevronLeft } from 'lucide-react-native';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatInput } from '@/components/chat/ChatInput';
import { MilestoneCard } from '@/components/chat/MilestoneCard';
import { DeepDiveNudge } from '@/components/chat/DeepDiveNudge';
import { DeepDiveBanner } from '@/components/chat/DeepDiveBanner';
import { HostChatJumpPills, monthKeysFromMessages } from '@/components/chat/HostChatJumpPills';
import { ChatSkeleton } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { dimensionLabel } from '@/constants/enrichment';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useChatLogic } from '@/hooks/use-chat-logic';
import * as Haptics from 'expo-haptics';
import { VoiceModeOverlay } from '@/components/chat/VoiceModeOverlay';
import type { ChatReplyQuote } from '@/lib/utils';
import { X } from 'lucide-react-native';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export default function ChatScreen() {
  const {
    isPromptType,
    promptMemory,
    promptTitle,
    isStartingConversation,
    flatListRef,
    serverMessages,
    isLoading,
    allMessages,
    streaming,
    streamingText,
    send,
    stop,
    handleBack,
    handleActions,
    chatMode,
    deepDiveDimension,
    handleEnterDeepDive,
    handleExitDeepDive,
    enrichmentStats,
  } = useChatLogic();

  const [voiceModeVisible, setVoiceModeVisible] = useState(false);
  const [replyQuote, setReplyQuote] = useState<ChatReplyQuote | null>(null);
  const [nudgeHidden, setNudgeHidden] = useState(false);

  // Pulsing live indicator
  const pulse = useSharedValue(0.7);
  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.4, { duration: 800 })),
      -1,
      true,
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: pulse.value }],
  }));

  const isActuallyStreaming = streaming || isStartingConversation;

  // Month keys for jump pills (from persisted server messages)
  const allServerMessages = serverMessages?.messages;
  const monthKeys = React.useMemo(
    () => monthKeysFromMessages(allServerMessages ?? []),
    [allServerMessages],
  );
  const categoryPills = React.useMemo(
    () => enrichmentStats.stats?.jump_pills ?? [],
    [enrichmentStats.stats?.jump_pills],
  );

  // Deep dive nudge visibility — destructure stable references to avoid
  // capturing the whole enrichmentStats object in callbacks/deps.
  const nudgeDimension = enrichmentStats.nudgeDimension;
  const nudgeQuestion = enrichmentStats.nudgeQuestion;
  const getDismissedNudges = enrichmentStats.getDismissedNudges;
  const dismissNudge = enrichmentStats.dismissNudge;

  // getDismissedNudges is a stable useCallback — safe to call during render.
  const dismissedNudges = getDismissedNudges();
  const showDeepDiveNudge =
    chatMode === 'open' &&
    !nudgeHidden &&
    nudgeDimension !== null &&
    !dismissedNudges.includes(nudgeDimension);

  const handleDismissNudge = useCallback(async () => {
    setNudgeHidden(true);
    if (nudgeDimension) {
      await dismissNudge(nudgeDimension);
    }
  }, [nudgeDimension, dismissNudge]);

  const handleStartDeepDiveFromNudge = useCallback(() => {
    setNudgeHidden(true);
    if (nudgeDimension) handleEnterDeepDive(nudgeDimension);
  }, [nudgeDimension, handleEnterDeepDive]);

  const handleCategoryPill = useCallback((starter: string) => {
    send(starter);
  }, [send]);

  const renderMessage = useCallback(
    ({ item }: { item: any }) => (
      <MessageBubble
        message={item}
        onReply={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setReplyQuote({ role: item.role, text: item.text });
        }}
      />
    ),
    [],
  );

  const listHeaderComponent = React.useMemo(() => {
    if (!isActuallyStreaming) return null;

    return streamingText ? (
      <MessageBubble message={{ role: 'assistant', text: streamingText } as any} />
    ) : (
      <TypingIndicator />
    );
  }, [isActuallyStreaming, streamingText]);

  const listFooterComponent = React.useMemo(() => {
    if (!isPromptType || !promptMemory) return null;

    return (
      <View className="mx-5 my-4 p-5 rounded-2xl border border-stroke-weaker bg-fill-weaker shadow-sm">
        <Animated.Text
          className="text-base text-text-strong leading-relaxed"
          style={{ fontFamily: FONTS.serif }}
        >
          {promptMemory.title}
        </Animated.Text>
      </View>
    );
  }, [isPromptType, promptMemory]);

  // Jump to message by month — scrolls to first message in that month
  const handleJumpToMonth = useCallback(
    (yyyyMm: string) => {
      const idx = [...allMessages].reverse().findIndex(
        (m) => (m as any).created_at?.slice(0, 7) === yyyyMm,
      );
      if (idx >= 0 && flatListRef.current) {
        // allMessages is reversed (inverted FlatList), so re-calculate index
        const invertedIdx = allMessages.length - 1 - idx;
        flatListRef.current.scrollToIndex({ index: invertedIdx, animated: true, viewPosition: 0 });
      }
    },
    [allMessages, flatListRef],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <ImageBackground source={PATTERN} className="flex-1" imageStyle={{ opacity: 0.03 }}>
        <SafeAreaView className="flex-1 bg-transparent" edges={['top']}>

          {/* ── Header ───────────────────────────────────────────────────── */}
          <View className="flex-row items-center gap-3 px-6 py-4">
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              className="size-10 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
            >
              <ChevronLeft size={20} color={COLORS.textBase} />
            </TouchableOpacity>

            <View className="flex-1">
              <Animated.Text
                className="text-lg text-text-strong"
                numberOfLines={1}
                style={{ fontFamily: FONTS.serif }}
              >
                {isPromptType
                  ? (promptMemory?.title ?? 'Prompt Reflection')
                  : (serverMessages?.title ?? 'Your Memento')}
              </Animated.Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Animated.View className="size-1.5 rounded-full bg-success" style={pulseStyle} />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleActions}
              activeOpacity={0.7}
              className="size-10 rounded-full items-center justify-center border border-stroke-weaker shadow-sm"
            >
              <MoreVertical size={20} color={COLORS.textWeak} />
            </TouchableOpacity>
          </View>

          {/* ── Host Chat toolbar: jump pills + deep dive + milestone ──── */}
          {!isPromptType && (
            <View className="pb-1">
              {/* Jump pills row */}
              <View className="px-4 py-1">
                <HostChatJumpPills
                  monthKeys={monthKeys}
                  categoryPills={categoryPills}
                  onJump={handleJumpToMonth}
                  onCategoryPill={handleCategoryPill}
                />
              </View>

              {/* Deep dive banner (while in deep_dive mode) */}
              {chatMode === 'deep_dive' && deepDiveDimension && (
                <View className="px-4 pb-1">
                  <DeepDiveBanner
                    dimensionLabel={dimensionLabel(deepDiveDimension)}
                    onExit={handleExitDeepDive}
                  />
                </View>
              )}

              {/* Milestone card */}
              {(enrichmentStats.deltaToday > 0 || enrichmentStats.milestoneJustReached) && (
                <View className="px-4 pb-1">
                  <MilestoneCard
                    enrichmentDelta={enrichmentStats.deltaToday}
                    milestoneLabel={
                      enrichmentStats.milestoneJustReached
                        ? enrichmentStats.stats?.milestone?.reached_label
                        : null
                    }
                  />
                </View>
              )}
            </View>
          )}

          {/* ── Deep Dive Nudge (floating above messages) ─────────────── */}
          {!isPromptType && showDeepDiveNudge && nudgeDimension && (
            <DeepDiveNudge
              dimension={nudgeDimension}
              question={nudgeQuestion}
              onDeepDive={handleStartDeepDiveFromNudge}
              onDismiss={handleDismissNudge}
            />
          )}

          {/* ── Prompt question card — pinned as permanent anchor for the reflection session ── */}
          {isPromptType && promptTitle && (
            <Animated.View
              entering={FadeInDown.duration(400)}
              className="mx-5 mb-3"
            >
              <View
                className="bg-white rounded-[20px] border border-stroke-weaker px-5 py-4 gap-3 shadow-sm"
              >
                <View
                  className="self-start rounded-full px-2.5 py-0.5"
                  style={{ backgroundColor: COLORS.brandSubtle, borderWidth: 1, borderColor: COLORS.brandTint }}
                >
                  <Animated.Text
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ fontFamily: FONTS.sansBold, color: COLORS.brand }}
                  >
                    Today's reflection
                  </Animated.Text>
                </View>
                <Animated.Text
                  className="text-[18px] text-text-strong leading-snug"
                  style={{ fontFamily: FONTS.serif }}
                >
                  {promptTitle}
                </Animated.Text>
              </View>
            </Animated.View>
          )}

          {/* ── Messages ─────────────────────────────────────────────── */}
          <View className="flex-1 relative bg-transparent">
            {isLoading && !allMessages.length ? (
              <ChatSkeleton />
            ) : (
              <FlatList
                ref={flatListRef}
                data={allMessages}
                inverted
                keyExtractor={(item, i) => (item as any)._id ?? String(i)}
                renderItem={renderMessage}
                contentContainerClassName="px-5 pb-6 pt-4"
                showsVerticalScrollIndicator={false}
                onScrollToIndexFailed={() => {}}
                ListHeaderComponent={listHeaderComponent}
                ListFooterComponent={listFooterComponent}
                ListEmptyComponent={
                  /* Prompt type: pinned card above handles the question display — nothing extra needed here */
                  isPromptType ? null : (
                    <View className="items-center justify-center py-24 gap-8">
                      <Animated.View
                        entering={FadeInUp.duration(600)}
                        className="size-24 rounded-full bg-white border border-stroke-weaker items-center justify-center shadow-sm"
                      >
                        <Animated.Text className="text-4xl">🌱</Animated.Text>
                      </Animated.View>
                      <View className="items-center gap-3 px-10">
                        <Animated.Text
                          entering={FadeInDown.delay(200)}
                          className="text-[28px] text-text-strong text-center"
                          style={{ fontFamily: FONTS.serif }}
                        >
                          Your story grows here
                        </Animated.Text>
                        <Animated.Text
                          entering={FadeInDown.delay(300)}
                          className="text-[15px] text-text-weak text-center leading-relaxed"
                          style={{ fontFamily: FONTS.sans }}
                        >
                          Share a memory, an emotion, or just say hello. Your AI companion is here to listen and help you preserve your legacy.
                        </Animated.Text>
                      </View>
                    </View>
                  )
                }
              />
            )}
          </View>

          {/* ── Reply Quote Preview Panel ────────────────────────────── */}
          {replyQuote && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              className="mx-5 mb-2.5 p-3 bg-white border border-stroke-weaker rounded-2xl flex-row items-center justify-between shadow-sm"
            >
              <View className="flex-1 pr-3 border-l-2 border-brand/50 pl-3">
                <Text
                  className="text-[10px] text-brand font-bold uppercase tracking-wider mb-0.5"
                  style={{ fontFamily: FONTS.sansBold }}
                >
                  Replying to {replyQuote.role === 'user' ? 'your message' : 'Memento'}
                </Text>
                <Text
                  className="text-[12px] text-text-weak leading-relaxed"
                  numberOfLines={1}
                  style={{ fontFamily: FONTS.sans }}
                >
                  {replyQuote.text}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setReplyQuote(null);
                }}
                activeOpacity={0.7}
                className="size-6 rounded-full bg-fill-weaker items-center justify-center border border-stroke-weaker"
              >
                <X size={12} color={COLORS.textWeak} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Chat Input ────────────────────────────────────────────── */}
          <ChatInput
            onSend={(text) => {
              send(text, replyQuote);
              setReplyQuote(null);
            }}
            onStop={stop}
            onVoice={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setVoiceModeVisible(true);
            }}
            loading={isActuallyStreaming || isLoading}
          />

          <VoiceModeOverlay
            visible={voiceModeVisible}
            onClose={() => setVoiceModeVisible(false)}
            conversationTitle={
              isPromptType
                ? (promptMemory?.title ?? 'Prompt Reflection')
                : (serverMessages?.title ?? 'Conversation')
            }
          />
        </SafeAreaView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({});
