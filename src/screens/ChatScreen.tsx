import { useThemeColors, useThemeStyles, useResolvedAppearance } from '@/hooks/use-theme-colors';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import MoreHorizontal from 'lucide-react-native/icons/ellipsis';
import PhoneCall from 'lucide-react-native/icons/phone-call';
import Volume2 from 'lucide-react-native/icons/volume-2';
import X from 'lucide-react-native/icons/x';
import {
  MessageBubble,
  type ChatAttachmentPreviewRequest,
} from '@/components/chat/MessageBubble';
import { VoiceSessionDivider } from '@/components/chat/VoiceSessionDivider';
import { DigitalMindHeader } from '@/components/chat/DigitalMindHeader';
import { VoiceChatComposer } from '@/components/chat/VoiceChatComposer';
import { MessageActionsProvider } from '@/components/chat/MessageActionsProvider';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatInput, type ChatSendPayload } from '@/components/chat/ChatInput';
import { MilestoneCard } from '@/components/chat/MilestoneCard';
import { DeepDiveNudge } from '@/components/chat/DeepDiveNudge';
import { DeepDiveBanner } from '@/components/chat/DeepDiveBanner';
import { PromptReflectionHeader } from '@/components/chat/PromptReflectionHeader';
import { ChatSkeleton } from '@/components/ui';
import { type ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { dimensionLabel } from '@/constants/enrichment';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useChatLogic } from '@/hooks/use-chat-logic';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useBackHandler } from '@/hooks/use-back-handler';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
import * as Haptics from 'expo-haptics';
import { savedCallVoice } from '@/features/chat/voice-call-voice';
import { useVoiceCall } from '@/hooks/use-voice-call';
import { useAuthStore, useUserStore } from '@/store';
import type { ChatReplyQuote } from '@/lib/utils';
import {
  vs,
  radius,
  minTouchTarget,
  iconSize,
  responsiveSpace,
} from '@/constants/responsive';
import {
  getComposerOverlayBottomPadding,
  getComposerOverlayMaxHeight,
} from '@/features/chat/composer-layout';
import { MediaPreviewModal } from '@/components/ui/MediaPreviewModal';
import { toast } from '@/components/ui/Toast';
import { runtimeDiagnostics } from '@/lib/runtime-diagnostics';
import {
  getChatMessageItemType,
  getChatMessageKey,
} from '@/features/chat/message-list';
import {
  getChatDayLabel,
  shouldShowChatDaySeparator,
} from '@/features/chat/chat-timeline';

const COLLAPSED_COMPOSER_HEIGHT = minTouchTarget(58);
const COMPOSER_OVERLAY_GAP = responsiveSpace(8);
const COMPOSER_OVERLAY_MIN_HEIGHT = vs(180);
const DEFAULT_HEADER_HEIGHT = 70;
const CHAT_VISIBLE_CONTENT_POSITION = Object.freeze({
  autoscrollToBottomThreshold: 0.2,
  startRenderingFromBottom: true,
});
const PROMPT_VISIBLE_CONTENT_POSITION = Object.freeze({
  autoscrollToBottomThreshold: 0.2,
  startRenderingFromBottom: false,
});

const CHAT_ORB = require('../../assets/images/onboarding/chat-ai-orb.png');

const STARTER_PROMPTS = [
  "Ask me about a memory I never want to forget.",
  "Ask me about the happiest chapter of my life.",
  "Ask me about someone who shaped who I am.",
] as const;

function ChatDateSeparator({ label }: { label: string }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.dateSeparator}>
      <View style={styles.dateSeparatorPill}>
        <Text style={styles.dateSeparatorLabel}>{label}</Text>
      </View>
    </View>
  );
}

const MemoMessageRow = React.memo(function MemoMessageRow({
  item,
  showDate,
  isHighlighted,
  onReply,
  onScrollToOriginal,
  onPreviewAttachments,
}: {
  item: any;
  showDate: boolean;
  isHighlighted: boolean;
  onReply: (item: any) => void;
  onScrollToOriginal: (text: string) => void;
  onPreviewAttachments: (request: ChatAttachmentPreviewRequest) => void;
}) {
  const handleReply = useCallback(() => {
    onReply(item);
  }, [item, onReply]);

  const handleScroll = useCallback(() => {
    if (item.replyTo?.text) {
      onScrollToOriginal(item.replyTo.text);
    }
  }, [item.replyTo?.text, onScrollToOriginal]);

  const hasText = ((item.text ?? item.content ?? '') as string).trim().length > 0;
  const rawAttachments = item.attatchments ?? item.attachments ?? [];
  const hasContent = hasText || rawAttachments.length > 0;

  if (!hasContent) return null;

  const timestamp = item.created_at || item.createdAt;

  return (
    <View>
      {showDate && timestamp ? <ChatDateSeparator label={getChatDayLabel(timestamp)} /> : null}
      {item.voice_boundary ? <VoiceSessionDivider active={item.voice_boundary === 'started'} /> : <MessageBubble
        message={item}
        highlighted={isHighlighted}
        animated={Boolean(item.isLive)}
        onReply={handleReply}
        onScrollToOriginal={item.replyTo?.text ? handleScroll : undefined}
        onPreviewAttachments={onPreviewAttachments}
      />}
    </View>
  );
});

export default function ChatScreen() {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);
  const dark = useResolvedAppearance() === 'dark';
  React.useEffect(() => {
    runtimeDiagnostics.record('screen', 'mount', { screen: 'chat' });
    return () => runtimeDiagnostics.record('screen', 'unmount', { screen: 'chat' });
  }, []);
  // Route labels show immediately; the header resolves canonical metadata for direct links.
  const { id: promptId, promptLabel, focusMessageId, focusAttachmentId, initialAudioUri } = useLocalSearchParams<{
    id?: string;
    promptLabel?: string;
    focusMessageId?: string;
    focusAttachmentId?: string;
    initialAudioUri?: string;
  }>();

  const {
    isPromptType,
    promptMemory,
    promptTitle,
    isStartingConversation,
    flatListRef,
    serverMessages,
    isLoading,
    allMessages,
    fetchOlderMessages,
    hasOlderMessages,
    isFetchingOlderMessages,
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
    activeChatId,
    router,
  } = useChatLogic();

  // Intercept Android hardware back to prevent app exit when history is empty
  useBackHandler(handleBack);

  const { voice: voiceCall } = useVoiceCall();
  const showInlineVoice = Boolean((voiceCall.isConnected || voiceCall.isConnecting || voiceCall.isEnding) && voiceCall.voiceTimeline?.memoryId === activeChatId);
  const [replyQuote, setReplyQuote] = useState<ChatReplyQuote | null>(null);
  const [replyQuoteHeight, setReplyQuoteHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);
  const [chatSurfaceHeight, setChatSurfaceHeight] = useState(0);
  const [nudgeHidden, setNudgeHidden] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<ChatAttachmentPreviewRequest | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const completedFocusRef = useRef<string | null>(null);
  const uploadedInitialAudioRef = useRef<string | null>(null);
  const { mutateAsync: uploadFile } = useFileUpload();

  const isActuallyStreaming = streaming || isStartingConversation;

  useFocusEffect(
    useCallback(() => {
      // Chat-scoped only. profile/memories() are 30s-stale queries that
      // refetch on their own when stale — invalidating them here forced up
      // to 4 refetches (incl. the 50-doc memories list) on every focus.
      if (activeChatId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.promptMessages(activeChatId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.memory(activeChatId) });
      }
    }, [activeChatId])
  );

  const prevMessageCountRef = useRef(allMessages.length);
  React.useEffect(() => {
    if (allMessages.length > prevMessageCountRef.current) {
      requestAnimationFrame(() => {
        try {
          flatListRef.current?.scrollToEnd({ animated: true });
        } catch {
          // Ignore if list is not layout-ready
        }
      });
    }
    prevMessageCountRef.current = allMessages.length;
  }, [allMessages.length, flatListRef]);

  React.useEffect(() => {
    if (!replyQuote) setReplyQuoteHeight(0);
  }, [replyQuote]);

  React.useEffect(() => {
    if (!initialAudioUri || uploadedInitialAudioRef.current === initialAudioUri || isLoading) return;
    uploadedInitialAudioRef.current = initialAudioUri;
    let cancelled = false;

    void (async () => {
      try {
        const file = await uploadFile({
          uri: initialAudioUri,
          type: 'audio/m4a',
          name: `voice_${Date.now()}.m4a`,
        });
        if (cancelled || !file?._id) return;
        await send('', null, [file._id], [{
          _id: file._id,
          url: file.url,
          name: file.name,
          type: file.type ?? 'audio/m4a',
          size: file.size,
        }]);
      } catch {
        if (!cancelled) {
          toast('Could not send your voice reflection. Try again.', 'error');
          uploadedInitialAudioRef.current = null;
        }
      }
    })();

    return () => { cancelled = true; };
  }, [initialAudioUri, isLoading, send, uploadFile]);

  React.useEffect(() => {
    const focusIdentity = focusMessageId ?? focusAttachmentId;
    if (!focusIdentity || completedFocusRef.current === focusIdentity) return;
    if (isLoading) return;
    const messageContainsAttachment = (message: any) => {
      if (!focusAttachmentId) return false;
      const attachments = message.attachments ?? message.attatchments ?? [];
      return attachments.some((attachment: any) => String(attachment?._id ?? attachment?.id ?? '') === focusAttachmentId);
    };
    const index = allMessages.findIndex((message: any) => message._id === focusMessageId || messageContainsAttachment(message));
    if (index >= 0) {
      const matchedMessageId = allMessages[index]?._id ?? focusMessageId ?? null;
      completedFocusRef.current = focusIdentity;
      setHighlightedMessageId(matchedMessageId);
      const frame = requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.35 });
      });
      const timeout = setTimeout(() => setHighlightedMessageId(null), 2200);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timeout);
      };
    }
    if (hasOlderMessages && !isFetchingOlderMessages) {
      void fetchOlderMessages();
    } else if (!hasOlderMessages) {
      completedFocusRef.current = focusIdentity;
    }
  }, [allMessages, fetchOlderMessages, focusAttachmentId, focusMessageId, hasOlderMessages, isFetchingOlderMessages, isLoading]);

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

  const handleNarration = useCallback(() => {
    Haptics.selectionAsync();
    router.push({ pathname: '/coming-soon', params: { feature: 'narration' } });
  }, [router]);

  const handleVoiceCall = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Start preparing the call now, while the call screen opens, for the same
    // conversation and voice it will use (see voice-warm-start.ts). Without a
    // saved voice the user picks one first, and the call screen prepares.
    const profile = useUserStore.getState().user ?? useAuthStore.getState().user;
    const voice = savedCallVoice(profile);
    if (voice) {
      const memoryId =
        activeChatId && /^[0-9a-fA-F]{24}$/.test(activeChatId)
          ? activeChatId
          : profile?.primary_conversation_id;
      voiceCall.prefetch({ memoryId, voiceName: voice.providerVoiceName });
    }
    router.push({
      pathname: '/voice-call',
      params: { memoryId: activeChatId ?? '', returnToChat: 'true' },
    });
  }, [activeChatId, router, voiceCall]);

  const allMessagesRef = useRef(allMessages);
  allMessagesRef.current = allMessages;

  const handleScrollToOriginal = useCallback((quotedText: string) => {
    // Find the message whose content matches the quoted text snippet
    const idx = allMessagesRef.current.findIndex((m: any) => {
      const body = m.text || m.content || '';
      return body.includes(quotedText.slice(0, 60));
    });
    if (idx >= 0 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
        Haptics.selectionAsync();
      } catch { /* scrollToIndex can throw if item not yet rendered */ }
    }
  }, [flatListRef]);

  const handlePreviewAttachments = useCallback((request: ChatAttachmentPreviewRequest) => {
    setAttachmentPreview(request);
  }, []);

  const handleCloseAttachmentPreview = useCallback(() => {
    setAttachmentPreview(null);
  }, []);

  const handleLoadOlderMessages = useCallback(() => {
    if (!hasOlderMessages || isFetchingOlderMessages) return;
    void fetchOlderMessages();
  }, [fetchOlderMessages, hasOlderMessages, isFetchingOlderMessages]);

  const handleReplyMessage = useCallback((item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReplyQuote({ role: item.role, text: item.text });
  }, []);

  const handleDismissReplyQuote = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReplyQuote(null);
  }, []);

  const handleSendPayload = useCallback((payload: ChatSendPayload) => {
    if (showInlineVoice) {
      if (payload.attachmentIds.length) {
        toast('Send attachments after your voice conversation ends.', 'error');
        return false;
      }
      try {
        voiceCall.sendText(replyQuote ? `Replying to: “${replyQuote.text}”\n\n${payload.text}` : payload.text);
        setReplyQuote(null);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Could not send. Please try again.', 'error');
        return false;
      }
      return;
    }
    send(
      payload.text,
      replyQuote,
      payload.attachmentIds.length ? payload.attachmentIds : undefined,
      payload.attachmentPreviews.length ? payload.attachmentPreviews : undefined,
    );
    setReplyQuote(null);
  }, [send, replyQuote, showInlineVoice, voiceCall]);

  // Day separators precomputed in one forward pass. renderMessage used to
  // walk backward per row (O(n²) trims + lookups on every render).
  const daySeparatorByKey = useMemo(() => {
    const map = new Map<string, boolean>();
    let previousTimestamp: string | undefined;
    for (const message of allMessages) {
      const text = ((message?.text ?? message?.content ?? '') as string).trim();
      const attachments = message?.attatchments ?? (message as any)?.attachments ?? [];
      const key = getChatMessageKey(message as any);
      if (!text && !attachments.length) {
        map.set(key, false);
        continue;
      }
      const currentTimestamp = (message as any)?.created_at || (message as any)?.createdAt;
      map.set(key, shouldShowChatDaySeparator(previousTimestamp, currentTimestamp));
      if (currentTimestamp) previousTimestamp = currentTimestamp;
    }
    return map;
  }, [allMessages]);

  const renderMessage = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const itemText = ((item.text ?? item.content ?? '') as string).trim();
      const itemAtt = item.attatchments ?? item.attachments ?? [];
      if (!itemText && !itemAtt.length) {
        return null;
      }

      const showDate = daySeparatorByKey.get(getChatMessageKey(item)) ?? false;

      return (
        <MemoMessageRow
          item={item}
          showDate={showDate}
          isHighlighted={item._id === highlightedMessageId}
          onReply={handleReplyMessage}
          onScrollToOriginal={handleScrollToOriginal}
          onPreviewAttachments={handlePreviewAttachments}
        />
      );
    },
    [handleReplyMessage, handleScrollToOriginal, handlePreviewAttachments, highlightedMessageId, daySeparatorByKey],
  );

  const streamingFooterComponent = React.useMemo(() => {
    if (!isActuallyStreaming) return null;

    return streamingText ? (
      <MessageBubble message={{ role: 'assistant', text: streamingText } as any} animated />
    ) : (
      <TypingIndicator />
    );
  }, [isActuallyStreaming, streamingText]);

  const promptHeaderComponent = React.useMemo(() => {
    const displayTitle = promptTitle || promptMemory?.title || '';
    const showPrompt = isPromptType && Boolean(displayTitle);
    if (!isFetchingOlderMessages && !showPrompt) return null;

    return (
      <>
        {isFetchingOlderMessages && (
          <View style={styles.loadingOlderMessages}>
            <ActivityIndicator color={COLORS.textWeak} size="small" />
            <Text style={styles.loadingOlderLabel}>Loading earlier messages</Text>
          </View>
        )}
        {showPrompt && displayTitle ? (
          <PromptReflectionHeader
            title={displayTitle}
            questionId={promptId}
            memoryId={promptMemory?._id}
            bookmarked={Boolean(promptMemory?.bookmarked)}
            category={promptLabel || promptMemory?.category}
          />
        ) : null}
      </>
    );
  }, [isFetchingOlderMessages, isPromptType, promptTitle, promptMemory?.title, promptMemory?.category, promptMemory?._id, promptMemory?.bookmarked, promptLabel, promptId]);

  const messagesContentStyle = React.useMemo(
    () => [styles.messagesContent, { paddingBottom: messageBottomPadding }],
    [messageBottomPadding],
  );

  const handleSelectStarter = useCallback((prompt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    send(prompt);
  }, [send]);

  const listEmptyComponent = React.useMemo(() => {
    if (isPromptType) return null;

    return (
      <View className="items-center justify-center px-6 py-12 gap-6">
        {/* AI Host Orb Illustration */}
        <Animated.View
          entering={FadeInUp.duration(600)}
          className="size-20 rounded-full bg-brand/10 items-center justify-center"
        >
          <Image
            source={CHAT_ORB}
            style={{ width: 56, height: 56 }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Heading & Subtitle */}
        <View className="items-center gap-2 px-4">
          <Animated.Text
            entering={FadeInDown.delay(200)}
            className="text-text-strong text-center"
            style={TYPE.screenTitle}
          >
            Your story begins here
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(300)}
            className="text-text-weak text-center leading-relaxed"
            style={TYPE.body}
          >
            Say hello or tap a thought below to start reflecting with your companion.
          </Animated.Text>
        </View>

        {/* Actionable Conversation Starter Chips */}
        <Animated.View
          entering={FadeInDown.delay(400)}
          className="w-full gap-2.5 mt-2"
        >
          {STARTER_PROMPTS.map((prompt) => (
            <TouchableOpacity
              key={prompt}
              onPress={() => handleSelectStarter(prompt)}
              activeOpacity={0.7}
              className="flex-row items-center gap-3 bg-fill-weaker border border-stroke-weaker rounded-2xl px-4 py-3.5"
            >
              <View className="size-1.5 rounded-full bg-brand" />
              <Text
                className="flex-1 text-text-strong"
                style={TYPE.label}
                numberOfLines={2}
              >
                {prompt}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>
    );
  }, [handleSelectStarter, isPromptType]);

  const content = (
    <View
      className="flex-1"
      onLayout={(event) => setChatSurfaceHeight(event.nativeEvent.layout.height)}
    >

      {/* ── Header ───────────────────────────────────────────────────── */}
      <View style={styles.header} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={handleBack}
          activeOpacity={0.7}
          style={styles.headerButton}
        >
          <ArrowLeft size={21} color={COLORS.textStrong} strokeWidth={2.2} />
        </TouchableOpacity>

        {isPromptType ? <Text numberOfLines={1} style={styles.headerTitle}>Prompt</Text> : <DigitalMindHeader />}

        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityLabel="Narration"
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={handleNarration}
            style={styles.headerButton}
          >
            <Volume2 size={20} color={COLORS.textStrong} strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Start voice call"
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={handleVoiceCall}
            style={styles.headerButton}
          >
            <PhoneCall size={20} color={COLORS.textStrong} strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel={isPromptType ? 'Open prompt settings' : 'Open chat settings'}
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={handleActions}
            style={styles.headerButton}
          >
            <MoreHorizontal size={21} color={COLORS.textStrong} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Contextual chat surfaces ───────────────────────────── */}
      {showInlineVoice && <VoiceChatComposer />}
      {!showInlineVoice && !isPromptType && (
        <View>
          {/* Deep dive banner (while in deep_dive mode) */}
          {chatMode === 'deep_dive' && deepDiveDimension && (
            <View className="px-4 pt-2">
              <DeepDiveBanner
                dimensionLabel={dimensionLabel(deepDiveDimension)}
                onExit={handleExitDeepDive}
              />
            </View>
          )}


        </View>
      )}

      {/* ── Deep Dive Nudge (floating above messages) ─────────────── */}
      {!showInlineVoice && !isPromptType && showDeepDiveNudge && nudgeDimension && (
        <DeepDiveNudge
          dimension={nudgeDimension}
          question={nudgeQuestion}
          onDeepDive={handleStartDeepDiveFromNudge}
          onDismiss={handleDismissNudge}
        />
      )}

      {/* ── Messages ─────────────────────────────────────────────── */}
      <View style={styles.messageList}>
        {(enrichmentStats.deltaToday > 0 || enrichmentStats.milestoneJustReached) && (
          <MilestoneCard
            enrichmentDelta={enrichmentStats.deltaToday}
            milestoneLabel={
              enrichmentStats.milestoneJustReached
                ? enrichmentStats.stats?.milestone?.reached_label
                : null
            }
          />
        )}
        {isLoading && !allMessages.length ? (
          <ChatSkeleton />
        ) : (
          <FlashList
            ref={flatListRef}
            data={allMessages}
            keyExtractor={getChatMessageKey}
            getItemType={getChatMessageItemType}
            // Pre-render distance — fewer blank flashes on fast scroll
            // through variable-height threads. (v2 auto-estimates sizes.)
            drawDistance={500}
            renderItem={renderMessage}
            onStartReached={handleLoadOlderMessages}
            onStartReachedThreshold={0.2}
            contentContainerStyle={messagesContentStyle}
            maintainVisibleContentPosition={isPromptType ? PROMPT_VISIBLE_CONTENT_POSITION : CHAT_VISIBLE_CONTENT_POSITION}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={promptHeaderComponent}
            ListFooterComponent={streamingFooterComponent}
            ListEmptyComponent={listEmptyComponent}
          />
        )}
      </View>

      <View
        pointerEvents="box-none"
        style={styles.composerOverlay}
      >
        <MaskedView
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.composerBackdrop, { bottom: -insets.bottom }]}
          maskElement={
            <View style={{ flex: 1 }}>
              <LinearGradient
                colors={['transparent', COLORS.textInverse]}
                style={{ height: 64 }}
              />
              <View style={{ flex: 1, backgroundColor: COLORS.textInverse }} />
            </View>
          }
        >
          {Platform.OS === 'ios' && (
            <BlurView tint={dark ? 'dark' : 'light'} intensity={90} style={StyleSheet.absoluteFill} />
          )}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? COLORS.glass : COLORS.card }]} />
        </MaskedView>
        {/* ── Reply Quote Preview Panel ────────────────────────────── */}
        {replyQuote && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            className="mx-5 mb-2.5 p-3 bg-fill-weaker rounded-2xl flex-row items-center justify-between"
            onLayout={(event) => setReplyQuoteHeight(event.nativeEvent.layout.height)}
          >
            <View className="flex-1 pr-3 pl-3" style={{ borderLeftWidth: 3, borderLeftColor: COLORS.brand }}>
              <Text
                className="text-text-weak"
                numberOfLines={2}
                ellipsizeMode="tail"
                style={TYPE.bodySmall}
              >
                {replyQuote.text}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleDismissReplyQuote}
              activeOpacity={0.7}
              hitSlop={10}
              className="size-6 rounded-full bg-fill-weaker items-center justify-center"
            >
              <X size={12} color={COLORS.textWeak} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Chat Input ────────────────────────────────────────────── */}
        <View>
          <ChatInput
            maxComposerHeight={composerOverlayMaxHeight}
            parentOwnsBottomSafeArea
            voiceMode={showInlineVoice}
            initialAudioUri={initialAudioUri}
            onSend={handleSendPayload}
            onStop={showInlineVoice ? voiceCall.interrupt : stop}
            disabled={showInlineVoice && (!voiceCall.isConnected || voiceCall.isReconnecting || voiceCall.isEnding)}
            loading={showInlineVoice ? false : isActuallyStreaming || isLoading}
          />
        </View>
      </View>

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
          <View style={styles.screenSurface}>
            <MessageActionsProvider>{content}</MessageActionsProvider>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.screenSurface}>
          <MessageActionsProvider>{content}</MessageActionsProvider>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  screenSurface: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: COLORS.strokeWeak,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 70,
    paddingHorizontal: 16,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: COLORS.fillWeak,
    borderRadius: radius(20),
    height: minTouchTarget(40),
    justifyContent: 'center',
    width: minTouchTarget(40),
  },
  headerTitle: {
    color: COLORS.textStrong,
    flex: 1,
    ...TYPE.uiTitle,
    lineHeight: 22,
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  messageList: {
    backgroundColor: COLORS.background,
    flex: 1,
    position: 'relative',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  dateSeparator: {
    alignItems: 'center',
    paddingBottom: 12,
    paddingTop: 4,
  },
  dateSeparatorPill: {
    backgroundColor: COLORS.fillWeak,
    borderColor: COLORS.strokeWeaker,
    borderRadius: radius(10),
    borderWidth: 1,
    minHeight: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  dateSeparatorLabel: {
    color: COLORS.textBase,
    ...TYPE.metadata,
    lineHeight: 14,
  },
  loadingOlderMessages: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 40,
  },
  loadingOlderLabel: {
    color: COLORS.textWeak,
    ...TYPE.bodySmall,
    lineHeight: 16,
  },
  composerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  composerBackdrop: {
    ...StyleSheet.absoluteFill,
    top: -64,
    overflow: 'hidden',
  },
});
