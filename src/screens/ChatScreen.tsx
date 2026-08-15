import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoreVertical, ChevronLeft } from 'lucide-react-native';
import {
  MessageBubble,
  type ChatAttachmentPreviewRequest,
} from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatInput, type ChatSendPayload } from '@/components/chat/ChatInput';
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
import { useLocalSearchParams } from 'expo-router';
import { useBackHandler } from '@/hooks/use-back-handler';
import * as Haptics from 'expo-haptics';
import { VoiceModeOverlay } from '@/components/chat/VoiceModeOverlay';
import type { ChatReplyQuote } from '@/lib/utils';
import { X } from 'lucide-react-native';
import { verticalScale } from 'react-native-size-matters';
import {
  getComposerOverlayBottomPadding,
  getComposerOverlayMaxHeight,
} from '@/features/chat/composer-layout';
import { MediaPreviewModal } from '@/components/ui/MediaPreviewModal';
import { runtimeDiagnostics } from '@/lib/runtime-diagnostics';
import {
  getChatMessageItemType,
  getChatMessageKey,
} from '@/features/chat/message-list';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');
const COLLAPSED_COMPOSER_HEIGHT = verticalScale(86);
const COMPOSER_OVERLAY_GAP = verticalScale(10);
const COMPOSER_OVERLAY_MIN_HEIGHT = verticalScale(180);
const DEFAULT_HEADER_HEIGHT = verticalScale(72);
const CHAT_VISIBLE_CONTENT_POSITION = Object.freeze({
  autoscrollToBottomThreshold: 0.2,
  startRenderingFromBottom: true,
});

export default function ChatScreen() {
  React.useEffect(() => {
    runtimeDiagnostics.record('screen', 'mount', { screen: 'chat' });
    return () => runtimeDiagnostics.record('screen', 'unmount', { screen: 'chat' });
  }, []);
  // promptLabel is only set by BrowseTopicsSection topic cards — daily prompts don't set it
  const { promptLabel } = useLocalSearchParams<{ promptLabel?: string }>();

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

  // Intercept Android hardware back to prevent app exit when history is empty
  useBackHandler(handleBack);

  const [voiceModeVisible, setVoiceModeVisible] = useState(false);
  const [replyQuote, setReplyQuote] = useState<ChatReplyQuote | null>(null);
  const [replyQuoteHeight, setReplyQuoteHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);
  const [chatSurfaceHeight, setChatSurfaceHeight] = useState(0);
  const [nudgeHidden, setNudgeHidden] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<ChatAttachmentPreviewRequest | null>(null);

  // Pulsing live indicator — only while active. Idle chat should not keep the
  // UI thread and GPU animating continuously in the background.
  const pulse = useSharedValue(0.7);
  const isActuallyStreaming = streaming || isStartingConversation;

  React.useEffect(() => {
    if (!isActuallyStreaming) {
      pulse.value = withTiming(0.7, { duration: 200 });
      return;
    }

    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.4, { duration: 800 })),
      -1,
      true,
    );
  }, [isActuallyStreaming, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: pulse.value }],
  }));

  React.useEffect(() => {
    if (!replyQuote) setReplyQuoteHeight(0);
  }, [replyQuote]);

  const composerOverlayMaxHeight = React.useMemo(() => (
    getComposerOverlayMaxHeight({
      visibleHeight: chatSurfaceHeight || COMPOSER_OVERLAY_MIN_HEIGHT + headerHeight,
      headerHeight,
      minHeight: COMPOSER_OVERLAY_MIN_HEIGHT,
    })
  ), [chatSurfaceHeight, headerHeight]);

  const messageBottomPadding = React.useMemo(() => (
    getComposerOverlayBottomPadding({
      collapsedComposerHeight: COLLAPSED_COMPOSER_HEIGHT,
      replyQuoteHeight: replyQuote ? replyQuoteHeight : 0,
      gap: COMPOSER_OVERLAY_GAP,
    })
  ), [replyQuote, replyQuoteHeight]);

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

  const handleScrollToOriginal = useCallback((quotedText: string) => {
    // Find the message whose content matches the quoted text snippet
    const idx = allMessages.findIndex((m: any) => {
      const body = m.text || m.content || '';
      return body.includes(quotedText.slice(0, 60));
    });
    if (idx >= 0 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
        Haptics.selectionAsync();
      } catch { /* scrollToIndex can throw if item not yet rendered */ }
    }
  }, [allMessages]);

  const handlePreviewAttachments = useCallback((request: ChatAttachmentPreviewRequest) => {
    setAttachmentPreview(request);
  }, []);

  const handleCloseAttachmentPreview = useCallback(() => {
    setAttachmentPreview(null);
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: any }) => (
      <MessageBubble
        message={item}
        onReply={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setReplyQuote({ role: item.role, text: item.text });
        }}
        onScrollToOriginal={
          (item as any).replyTo?.text
            ? () => handleScrollToOriginal((item as any).replyTo.text)
            : undefined
        }
        onPreviewAttachments={handlePreviewAttachments}
      />
    ),
    [handlePreviewAttachments, handleScrollToOriginal],
  );

  const streamingFooterComponent = React.useMemo(() => {
    if (!isActuallyStreaming) return null;

    return streamingText ? (
      <MessageBubble message={{ role: 'assistant', text: streamingText } as any} />
    ) : (
      <TypingIndicator />
    );
  }, [isActuallyStreaming, streamingText]);

  const promptHeaderComponent = React.useMemo(() => {
    if (!isPromptType || !promptMemory) return null;

    return (
      <View className="mx-5 my-4 p-5 rounded-2xl bg-fill-weaker">
        <Animated.Text
          className="text-base text-text-strong leading-relaxed"
          style={{ fontFamily: FONTS.serif }}
        >
          {promptMemory.title}
        </Animated.Text>
      </View>
    );
  }, [isPromptType, promptMemory]);

  const messagesContentStyle = React.useMemo(
    () => [styles.messagesContent, { paddingBottom: messageBottomPadding }],
    [messageBottomPadding],
  );

  const listEmptyComponent = React.useMemo(() => {
    if (isPromptType) return null;

    return (
      <View className="items-center justify-center py-24 gap-8">
        <Animated.View
          entering={FadeInUp.duration(600)}
          className="size-24 rounded-full bg-fill-weaker items-center justify-center"
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
    );
  }, [isPromptType]);

  // Jump to message by month — scrolls to first message in that month
  const handleJumpToMonth = useCallback(
    (yyyyMm: string) => {
      const idx = allMessages.findIndex(
        (m) => (m as any).created_at?.slice(0, 7) === yyyyMm,
      );
      if (idx >= 0 && flatListRef.current) {
        flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0 });
      }
    },
    [allMessages, flatListRef],
  );

  const content = (
    <View
      className="flex-1"
      onLayout={(event) => setChatSurfaceHeight(event.nativeEvent.layout.height)}
    >

          {/* ── Header ───────────────────────────────────────────────────── */}
          <View
            className="flex-row items-center gap-3 px-6 py-4"
            onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
          >
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              className="size-10 rounded-full bg-fill-weaker items-center justify-center"
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
              className="size-10 rounded-full items-center justify-center bg-fill-weaker"
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
                className="bg-white rounded-[20px] px-5 py-4 gap-3"
              >
                <View
                  className="self-start rounded-full px-2.5 py-0.5"
                  style={{ backgroundColor: COLORS.brandSubtle }}
                >
                  <Animated.Text
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ fontFamily: FONTS.sansBold, color: COLORS.brand }}
                  >
                    {promptLabel
                      ? promptLabel.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                      : "Today's reflection"}
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
              <FlashList
                ref={flatListRef}
                data={allMessages}
                keyExtractor={getChatMessageKey}
                getItemType={getChatMessageItemType}
                renderItem={renderMessage}
                contentContainerStyle={messagesContentStyle}
                maintainVisibleContentPosition={CHAT_VISIBLE_CONTENT_POSITION}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={promptHeaderComponent}
                ListFooterComponent={streamingFooterComponent}
                ListEmptyComponent={listEmptyComponent}
              />
            )}
          </View>

          <View pointerEvents="box-none" style={styles.composerOverlay}>
            {/* ── Reply Quote Preview Panel ────────────────────────────── */}
            {replyQuote && (
              <Animated.View
                entering={FadeInDown.duration(200)}
                className="mx-5 mb-2.5 p-3 bg-fill-weaker rounded-2xl flex-row items-center justify-between"
                onLayout={(event) => setReplyQuoteHeight(event.nativeEvent.layout.height)}
              >
                <View className="flex-1 pr-3 pl-3" style={{ borderLeftWidth: 3, borderLeftColor: COLORS.brand }}>
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
                  className="size-6 rounded-full bg-fill-weaker items-center justify-center"
                >
                  <X size={12} color={COLORS.textWeak} />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ── Chat Input ────────────────────────────────────────────── */}
            <ChatInput
              maxComposerHeight={composerOverlayMaxHeight}
              onSend={(payload: ChatSendPayload) => {
                send(
                  payload.text,
                  replyQuote,
                  payload.attachmentIds.length ? payload.attachmentIds : undefined,
                  payload.attachmentPreviews.length ? payload.attachmentPreviews : undefined,
                );
                setReplyQuote(null);
              }}
              onStop={stop}
              onVoice={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setVoiceModeVisible(true);
              }}
              loading={isActuallyStreaming || isLoading}
            />
          </View>

          <VoiceModeOverlay
            visible={voiceModeVisible}
            onClose={() => setVoiceModeVisible(false)}
            conversationTitle={
              isPromptType
                ? (promptMemory?.title ?? 'Prompt Reflection')
                : (serverMessages?.title ?? 'Conversation')
            }
          />

          {attachmentPreview && (
            <MediaPreviewModal
              visible
              attachments={attachmentPreview.attachments}
              initialIndex={attachmentPreview.initialIndex}
              onClose={handleCloseAttachmentPreview}
            />
          )}
        </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top', 'bottom']}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ImageBackground source={PATTERN} className="flex-1" imageStyle={{ opacity: 0.03 }}>
            {content}
          </ImageBackground>
        </KeyboardAvoidingView>
      ) : (
        <ImageBackground source={PATTERN} className="flex-1" imageStyle={{ opacity: 0.03 }}>
          {content}
        </ImageBackground>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  messagesContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  composerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
});
