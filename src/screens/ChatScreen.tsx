import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurTargetView, BlurView } from 'expo-blur';
import { ArrowLeft, MoreHorizontal, PhoneCall, Volume2, X } from 'lucide-react-native';
import {
  MessageBubble,
  type ChatAttachmentPreviewRequest,
} from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatInput, type ChatSendPayload } from '@/components/chat/ChatInput';
import { MilestoneCard } from '@/components/chat/MilestoneCard';
import { DeepDiveNudge } from '@/components/chat/DeepDiveNudge';
import { DeepDiveBanner } from '@/components/chat/DeepDiveBanner';
import { PromptReflectionHeader } from '@/components/chat/PromptReflectionHeader';
import { ChatSkeleton } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { dimensionLabel } from '@/constants/enrichment';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useChatLogic } from '@/hooks/use-chat-logic';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { useLocalSearchParams } from 'expo-router';
import { useBackHandler } from '@/hooks/use-back-handler';
import * as Haptics from 'expo-haptics';
import type { ChatReplyQuote } from '@/lib/utils';
import { verticalScale } from 'react-native-size-matters';
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

const COLLAPSED_COMPOSER_HEIGHT = 58;
const COMPOSER_OVERLAY_GAP = 8;
const COMPOSER_OVERLAY_MIN_HEIGHT = verticalScale(180);
const DEFAULT_HEADER_HEIGHT = 70;
const CHAT_VISIBLE_CONTENT_POSITION = Object.freeze({
  autoscrollToBottomThreshold: 0.2,
  startRenderingFromBottom: true,
});
const PROMPT_VISIBLE_CONTENT_POSITION = Object.freeze({
  autoscrollToBottomThreshold: 0.2,
  startRenderingFromBottom: false,
});

function ChatDateSeparator({ label }: { label: string }) {
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

  return (
    <View>
      {showDate && <ChatDateSeparator label={getChatDayLabel(item.created_at)} />}
      <MessageBubble
        message={item}
        highlighted={isHighlighted}
        animated={Boolean(item.isLive)}
        onReply={handleReply}
        onScrollToOriginal={item.replyTo?.text ? handleScroll : undefined}
        onPreviewAttachments={onPreviewAttachments}
      />
    </View>
  );
});

export default function ChatScreen() {
  React.useEffect(() => {
    runtimeDiagnostics.record('screen', 'mount', { screen: 'chat' });
    return () => runtimeDiagnostics.record('screen', 'unmount', { screen: 'chat' });
  }, []);
  // promptLabel is only set by BrowseTopicsSection topic cards — daily prompts don't set it
  const { promptLabel, focusMessageId, focusAttachmentId, initialAudioUri } = useLocalSearchParams<{
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

  const [replyQuote, setReplyQuote] = useState<ChatReplyQuote | null>(null);
  const [replyQuoteHeight, setReplyQuoteHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);
  const [chatSurfaceHeight, setChatSurfaceHeight] = useState(0);
  const [nudgeHidden, setNudgeHidden] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<ChatAttachmentPreviewRequest | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const completedFocusRef = useRef<string | null>(null);
  const uploadedInitialAudioRef = useRef<string | null>(null);
  const blurTargetRef = useRef<View>(null);
  const { mutateAsync: uploadFile } = useFileUpload();

  const isActuallyStreaming = streaming || isStartingConversation;

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
    router.push({
      pathname: '/voice-call',
      params: { memoryId: activeChatId ?? '' },
    });
  }, [activeChatId, router]);

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
    send(
      payload.text,
      replyQuote,
      payload.attachmentIds.length ? payload.attachmentIds : undefined,
      payload.attachmentPreviews.length ? payload.attachmentPreviews : undefined,
    );
    setReplyQuote(null);
  }, [send, replyQuote]);

  const renderMessage = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      let previousTimestamp: string | undefined;
      const msgs = allMessagesRef.current;
      for (let i = index - 1; i >= 0; i -= 1) {
        const ts = (msgs[i] as any)?.created_at || (msgs[i] as any)?.createdAt;
        if (ts) {
          previousTimestamp = ts;
          break;
        }
      }
      const currentTimestamp = item.created_at || item.createdAt;
      const showDate = shouldShowChatDaySeparator(previousTimestamp, currentTimestamp);

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
    [handleReplyMessage, handleScrollToOriginal, handlePreviewAttachments, highlightedMessageId],
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
            category={promptLabel}
          />
        ) : null}
      </>
    );
  }, [isFetchingOlderMessages, isPromptType, promptTitle, promptMemory?.title, promptLabel]);

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
          <Animated.Text className="" style={TYPE.displayTitle}>🌱</Animated.Text>
        </Animated.View>
        <View className="items-center gap-3 px-10">
          <Animated.Text
            entering={FadeInDown.delay(200)}
            className="text-text-strong text-center"
            style={TYPE.screenTitle}
          >
            Your story grows here
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(300)}
            className="text-text-weak text-center"
            style={TYPE.body}
          >
            Share a memory, an emotion, or just say hello. Your AI companion is here to listen and help you preserve your legacy.
          </Animated.Text>
        </View>
      </View>
    );
  }, [isPromptType]);

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

        <Text numberOfLines={1} style={styles.headerTitle}>Chat</Text>

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
            accessibilityLabel="Open chat settings"
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
      {!isPromptType && (
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
      {!isPromptType && showDeepDiveNudge && nudgeDimension && (
        <DeepDiveNudge
          dimension={nudgeDimension}
          question={nudgeQuestion}
          onDeepDive={handleStartDeepDiveFromNudge}
          onDismiss={handleDismissNudge}
        />
      )}

      {/* ── Messages ─────────────────────────────────────────────── */}
      <BlurTargetView ref={blurTargetRef} style={styles.messageList}>
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
      </BlurTargetView>

      <View
        pointerEvents="box-none"
        style={styles.composerOverlay}
      >
        <BlurView
          pointerEvents="none"
          intensity={Platform.OS === 'android' ? 90 : 75}
          tint="light"
          blurTarget={blurTargetRef}
          blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
          style={styles.composerBackdrop}
        />
        {/* ── Reply Quote Preview Panel ────────────────────────────── */}
        {replyQuote && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            className="mx-5 mb-2.5 p-3 bg-fill-weaker rounded-2xl flex-row items-center justify-between"
            onLayout={(event) => setReplyQuoteHeight(event.nativeEvent.layout.height)}
          >
            <View className="flex-1 pr-3 pl-3" style={{ borderLeftWidth: 3, borderLeftColor: COLORS.brand }}>
              <Text
                className="text-brand uppercase tracking-wider mb-0.5"
                style={TYPE.eyebrow}
              >
                Replying to {replyQuote.role === 'user' ? 'your message' : 'Memento'}
              </Text>
              <Text
                className="text-text-weak"
                numberOfLines={1}
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
        <ChatInput
          maxComposerHeight={composerOverlayMaxHeight}
          parentOwnsBottomSafeArea
          initialAudioUri={initialAudioUri}
          onSend={handleSendPayload}
          onStop={stop}
          loading={isActuallyStreaming || isLoading}
        />
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
            {content}
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.screenSurface}>
          {content}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
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
    gap: 8,
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
    borderRadius: 10,
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
    backgroundColor: COLORS.background,
    // top: -12,
  },
});
