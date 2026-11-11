import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
/**
 * app/(tabs)/stories/[id].tsx — Story detail
 *
 * Layout matches design spec:
 *  Header: back | Edit pill | ... menu
 *  Title: large bold heading
 *  Tags + date bar
 *  Asymmetric image mosaic (row1: wide+narrow | row2: 3 equal, last has +N overlay)
 *  Clean body paragraphs
 *  Attachment cards (voice / audio / document)
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useVoiceContent } from '@/features/voice-control/hooks';
import { storyHtmlToPlainText } from '@/features/voice-control/story-text';
import {
  View,
  Text,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { StoryComposerBackdrop } from '@/components/editor/StoryComposerBackdrop';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Pencil from 'lucide-react-native/icons/pencil';
import MoreHorizontal from 'lucide-react-native/icons/ellipsis';
import FileText from 'lucide-react-native/icons/file-text';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import MessageSquare from 'lucide-react-native/icons/message-square';
import dayjs from 'dayjs';
import Animated from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { MemTag, Skeleton, EmptyState } from '@/components/ui';
import { StoryHtmlBody } from '@/components/memory/StoryHtmlBody';
import { AudioAttachmentCard } from '@/components/media/AudioAttachmentCard';
import { MediaPreviewModal } from '@/components/ui/MediaPreviewModal';
import { VideoThumbnail } from '@/components/ui/VideoThumbnail';
import { SignedAttachmentImage } from '@/components/ui/SignedAttachmentImage';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, radius, minTouchTarget, responsiveSpace } from '@/constants/responsive';
import { returnFromStory } from '@/features/navigation/story-navigation';
import { useStoryDetailLogic } from '@/hooks/use-story-detail-logic';
import { useBackHandler } from '@/hooks/use-back-handler';
import { useConversationMessages } from '@/hooks/queries/use-memories';
import { mergeConversationMessagePages } from '@/features/chat/conversation-pagination';

const EMPTY_MEMORIES_IMG = require('../../../assets/images/illustrations/empty_memories.webp');

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StoryDetailSkeleton() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <View style={{ paddingVertical: 20, paddingHorizontal: 16, gap: 16 }}>
        <Skeleton style={{ height: 40, width: '80%', borderRadius: 8 }} />
        <Skeleton style={{ height: 18, width: '50%', borderRadius: 8 }} />
        {/* mosaic skeleton */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Skeleton style={{ flex: 1.7, aspectRatio: 1.1, borderRadius: 14 }} />
          <Skeleton style={{ flex: 1, aspectRatio: 0.75, borderRadius: 14 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0, 1, 2].map(i => <Skeleton key={i} style={{ flex: 1, aspectRatio: 1, borderRadius: 14 }} />)}
        </View>
        {[90, 100, 80, 95, 70].map((w, i) => (
          <Skeleton key={i} style={{ height: 16, width: `${w}%`, borderRadius: 6 }} />
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

const MemoMosaicTile = React.memo(function MemoMosaicTile({
  item,
  isWide,
  isSquare,
  showMoreCount,
  memoryId,
  onPress,
}: {
  item: any;
  isWide?: boolean;
  isSquare?: boolean;
  showMoreCount?: number;
  memoryId?: string;
  onPress: (item: any) => void;
}) {
  const COLORS = useThemeColors();
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={{
        flex: isWide ? 1.7 : 1,
        aspectRatio: isSquare ? 1 : undefined,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: COLORS.fillWeak,
      }}
    >
      <SignedAttachmentImage
        attachment={item}
        context={memoryId ? { memory_id: memoryId } : undefined}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      {showMoreCount && showMoreCount > 0 ? (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: COLORS.mediaScrim, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...TYPE.uiTitle, color: COLORS.mediaText }}>+{showMoreCount} more</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

const MemoDocumentCard = React.memo(function MemoDocumentCard({
  item,
  onPress,
}: {
  item: any;
  onPress: (url?: string) => void;
}) {
  const COLORS = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = (Math.min(windowWidth, 720) - 40) / 2;
  const handlePress = useCallback(() => onPress(item.url), [item.url, onPress]);
  const fileType = item.type?.split('/')[1]?.toUpperCase() ?? 'FILE';
  const fileSize = (item.size && Number(item.size) > 0)
    ? `${(Number(item.size) / 1024 / 1024).toFixed(1)} MB`
    : null;
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.88}
      style={{ backgroundColor: COLORS.fillWeak, borderRadius: radius(20), aspectRatio: 1, width: cardWidth, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 }}
    >
      <View style={{ width: 48, height: 48, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.strokeWeaker, alignItems: 'center', justifyContent: 'center' }}>
        <FileText size={24} color={COLORS.brand} strokeWidth={1.5} />
      </View>
      <Text style={{ ...TYPE.metadata, color: COLORS.textStrong, textAlign: 'center' }} numberOfLines={2}>
        {item.name || 'Document'}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ backgroundColor: `${COLORS.brand}15`, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ ...TYPE.eyebrow, color: COLORS.brand }}>{fileType}</Text>
        </View>
        {fileSize && <Text style={{ ...TYPE.eyebrow, color: COLORS.textMuted }}>{fileSize}</Text>}
      </View>
    </TouchableOpacity>
  );
});

// ─── Prompt Reply Section ─────────────────────────────────────────────────────
// For daily reflection / prompt memories the user's actual reply is stored as
// chat messages (role: 'user'), not in memory.body. We fetch them here and
// display them as a clean prose block.

function PromptReplySection({ memoryId }: { memoryId: string }) {
  const COLORS = useThemeColors();
  const {
    data: messagePages,
    isLoading,
  } = useConversationMessages(memoryId);

  const userReplies = useMemo(() => {
    const all = mergeConversationMessagePages(messagePages?.pages ?? []);
    return all.filter(
      (m) => m.role === 'user' && (m.text || (m as any).content),
    );
  }, [messagePages]);

  if (isLoading) {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
        <Skeleton style={{ height: 16, width: '90%', borderRadius: 6 }} />
        <Skeleton style={{ height: 16, width: '75%', borderRadius: 6 }} />
        <Skeleton style={{ height: 16, width: '83%', borderRadius: 6 }} />
      </View>
    );
  }

  if (userReplies.length === 0) return null;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 6 }}>
      {/* Section label */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <MessageSquare size={13} color={COLORS.textMuted} strokeWidth={1.8} />
        <Text style={{ ...TYPE.eyebrow, color: COLORS.textMuted, letterSpacing: 1.1, textTransform: 'uppercase' }}>
          Your reply
        </Text>
      </View>

      {userReplies.map((msg, i) => {
        const text = (msg.text || (msg as any).content || '').trim();
        return (
          <Text
            key={msg._id || `reply-${i}`}
            style={{
              ...TYPE.body,
              color: COLORS.textStrong,
              lineHeight: 26,
            }}
          >
            {text}
          </Text>
        );
      })}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function StoryDetailScreen() {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const { width: windowWidth } = useWindowDimensions();
  const videoWidth = Math.min(windowWidth, 720) - 40;
  const {
    router,
    returnToOverview,
    memory,
    isLoading,
    handleDelete,
    handleEdit,
    handleOpenActions,
    deleting,
    imageAttachments,
    audioAttachments,
    otherAttachments,
  } = useStoryDetailLogic();
  useVoiceContent('Story', () =>
    memory ? `${memory.title || 'Untitled'}. ${storyHtmlToPlainText(String(memory.body || ''))}` : '',
  );

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    returnFromStory(router, returnToOverview);
  }, [returnToOverview, router]);
  useBackHandler(handleBack);

  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const handleOpenFile = useCallback(async (url?: string) => {
    if (url) await WebBrowser.openBrowserAsync(url);
  }, []);

  // ── Split image attachments by type ──────────────────────────────────────
  const imgOnly = useMemo(() => imageAttachments.filter(a => !a.type?.startsWith('video/')), [imageAttachments]);
  const videos  = useMemo(() => imageAttachments.filter(a =>  a.type?.startsWith('video/')), [imageAttachments]);

  // All previewable media: images + videos + audio
  const allPreviewAttachments = useMemo(
    () => [...imageAttachments, ...audioAttachments],
    [imageAttachments, audioAttachments],
  );

  const openPreview = useCallback((item: typeof allPreviewAttachments[0]) => {
    const idx = allPreviewAttachments.findIndex(a => a.url === item.url);
    setPreviewIndex(idx >= 0 ? idx : 0);
    setPreviewVisible(true);
    Haptics.selectionAsync();
  }, [allPreviewAttachments]);

  const closePreview = useCallback(() => setPreviewVisible(false), []);

  const handleEditPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleEdit();
  }, [handleEdit]);

  const handleActionsPress = useCallback(() => {
    Haptics.selectionAsync();
    handleOpenActions();
  }, [handleOpenActions]);

  const modalAttachments = useMemo(
    () => allPreviewAttachments.map(a => {
      const isAudio = a.type?.startsWith('audio/');
      const audioTitle = memory?.title && memory.title !== 'Untitled Memory' ? memory.title : undefined;
      return {
        clientId: a._id ?? (a.url ?? ''),
        uri: a.url ?? '',
        name: (isAudio && audioTitle) ? audioTitle : (a.name ?? ''),
        mimeType: a.type ?? 'application/octet-stream',
        duration: (a as any).duration,
        isVoice: a.name?.startsWith('voice_') && a.type === 'audio/m4a',
        thumbnailUrl: (a as any).thumbnail ?? null,
        persistedFileId: a._id,
        access: a.access,
      };
    }),
    [allPreviewAttachments, memory?.title],
  );

  // Mosaic grid: row1 = [0, 1], row2 = [2, 3, 4], rest hidden with "+N"
  const MAX_SHOWN = 5;
  const shownImgs = useMemo(() => imgOnly.slice(0, MAX_SHOWN), [imgOnly]);
  const extraCount = useMemo(() => Math.max(0, imgOnly.length - MAX_SHOWN), [imgOnly]);
  const row1 = useMemo(() => shownImgs.slice(0, 2), [shownImgs]);
  const row2 = useMemo(() => shownImgs.slice(2, 5), [shownImgs]);

  // ── Tag display ───────────────────────────────────────────────────────────
  const MAX_TAGS = 3;
  const visibleTags = useMemo(() => (memory?.tags ?? []).slice(0, MAX_TAGS), [memory?.tags]);
  const extraTags = useMemo(() => Math.max(0, (memory?.tags?.length ?? 0) - MAX_TAGS), [memory?.tags]);

  // ── Loading / not found ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
        {/* Header skeleton */}
        <View style={styles.header}>
          <Skeleton style={{ width: 36, height: 36, borderRadius: 18 }} />
          <View style={{ flex: 1 }} />
          <Skeleton style={{ width: 80, height: 36, borderRadius: 18 }} />
          <Skeleton style={{ width: 36, height: 36, borderRadius: 18 }} />
        </View>
        <StoryDetailSkeleton />
      </SafeAreaView>
    );
  }

  if (!memory) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.iconBtn}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={20} color={COLORS.textBase} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <EmptyState
          image={EMPTY_MEMORIES_IMG}
          title="Story unavailable"
          description="This story may have been removed or is no longer accessible."
          actionLabel={returnToOverview ? 'Back to overview' : 'Back to stories'}
          onAction={handleBack}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
    {/* Same album paper as the add-story page, light or dark by appearance. */}
    <StoryComposerBackdrop />
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.iconBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={iconSize(20)} color={COLORS.textBase} strokeWidth={2} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* Edit pill */}
        <TouchableOpacity
          onPress={handleEditPress}
          style={styles.editPill}
          activeOpacity={0.8}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Pencil size={iconSize(14)} color={COLORS.textBase} strokeWidth={2} />
          <Text style={styles.editLabel}>Edit</Text>
        </TouchableOpacity>

        {/* Actions menu */}
        <TouchableOpacity
          onPress={handleActionsPress}
          style={styles.iconBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Story actions"
        >
          <MoreHorizontal size={iconSize(20)} color={COLORS.textBase} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Title ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
          <Animated.Text
            {...{ sharedTransitionTag: `memory-title-${memory._id}` } as any}
            style={styles.title}
          >
            {memory.title || 'Untitled Memory'}
          </Animated.Text>
        </View>

        {/* ── Tags + date bar ── */}
        {((memory.tags?.length ?? 0) > 0 || memory.created_at) && (
          <View style={styles.metaRow}>
            {/* Tag pills */}
            <View style={styles.tagRow}>
              {visibleTags.map(tag => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {extraTags > 0 && (
                <View style={[styles.tagPill, { backgroundColor: COLORS.fillWeak }]}>
                  <Text style={styles.tagText}>+{extraTags}</Text>
                </View>
              )}
            </View>

            {/* Date */}
            {memory.created_at && (
              <View style={styles.dateRow}>
                <CalendarDays size={14} color={COLORS.brand} strokeWidth={1.8} />
                <Text style={styles.dateText}>{dayjs(memory.created_at).format('ddd, MMM D')}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Image mosaic ── */}
        {imgOnly.length > 0 && (
          <View style={{ paddingHorizontal: 16, gap: 6, marginBottom: 8 }}>
            {/* Row 1: wide + narrow */}
            {row1.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 6, height: 200 }}>
                {row1.map((item, idx) => (
                  <MemoMosaicTile
                    key={item.url ?? idx}
                    item={item}
                    memoryId={memory._id}
                    isWide={idx === 0}
                    onPress={openPreview}
                  />
                ))}
              </View>
            )}

            {/* Row 2: 3 equal squares, last gets "+N more" overlay */}
            {row2.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {row2.map((item, idx) => {
                  const isLast = idx === row2.length - 1 && idx === 2;
                  const showMore = isLast && extraCount > 0;
                  return (
                    <MemoMosaicTile
                      key={item.url ?? idx}
                      item={item}
                      memoryId={memory._id}
                      isSquare
                      showMoreCount={showMore ? extraCount : undefined}
                      onPress={openPreview}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Videos — real extracted thumbnail + play button via VideoThumbnail */}
        {videos.length > 0 && (
          <View style={{ paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
            {videos.map((item, idx) => (
              <VideoThumbnail
                key={item.url ?? idx}
                uri={item.url ?? ''}
                attachment={item}
                context={{ memory_id: memory._id }}
                thumbnailUrl={item.thumbnail}
                width={videoWidth}
                height={videoWidth * (9 / 16)}
                onPress={() => openPreview(item)}
              />
            ))}
          </View>
        )}

        {/* Audio — full-width player rows; tapping one opens the audio player (MediaPreviewModal) */}
        {audioAttachments.length > 0 && (
          <View style={{ paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
            {audioAttachments.map((item) => (
              <AudioAttachmentCard
                key={item._id}
                item={item}
                memoryTitle={memory?.title}
                onPress={openPreview}
              />
            ))}
          </View>
        )}

        {/* ── Body ── */}
        {memory.body ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <StoryHtmlBody html={memory.body} />
          </View>
        ) : null}

        {/* ── Prompt reply thread (for conversation/prompt memories) ── */}
        {memory.type === 'conversation' && !memory.body && (
          <PromptReplySection memoryId={memory._id} />
        )}

        {/* ── Other attachments (documents only) ── */}
        {otherAttachments.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 8 }}>
            <Text style={styles.sectionLabel}>DOCUMENTS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {otherAttachments.map(a => (
                <MemoDocumentCard
                  key={a._id}
                  item={a}
                  onPress={handleOpenFile}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Full-screen media previewer — images, videos, and audio */}
      <MediaPreviewModal
        visible={previewVisible}
        attachments={modalAttachments}
        initialIndex={previewIndex}
        onClose={closePreview}
      />
    </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (COLORS: ThemeColors) => ({
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: radius(18),
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  editPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    height: 36, paddingHorizontal: 14,
    borderRadius: radius(18),
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
  },
  editLabel: { ...TYPE.label, color: COLORS.textBase },
  title: {
    ...TYPE.screenTitle,
    color: COLORS.textStrong,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  tagRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    flex: 1,
  },
  tagPill: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.strokeWeak,
  },
  tagText: { ...TYPE.bodySmall, color: COLORS.textBase },
  dateRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5,
  },
  dateText: { ...TYPE.bodySmall, color: COLORS.textBase },
  body: {
    ...TYPE.body,
    color: COLORS.textStrong,
  },
  sectionLabel: {
    ...TYPE.eyebrow,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
});
