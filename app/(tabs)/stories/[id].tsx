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
import React, { useState } from 'react';
import {
  View, Text, ScrollView, Image,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Pencil, MoreHorizontal,
  FileText, Music, CalendarDays,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import Animated from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { MemTag, Skeleton } from '@/components/ui';
import { StoryHtmlBody } from '@/components/memory/StoryHtmlBody';
import { MediaPreviewModal } from '@/components/ui/MediaPreviewModal';
import { VideoThumbnail } from '@/components/ui/VideoThumbnail';
import { COLORS, FONTS } from '@/constants/tokens';
import { useStoryDetailLogic } from '@/hooks/use-story-detail-logic';
import { useBackHandler } from '@/hooks/use-back-handler';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StoryDetailSkeleton() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <View style={{ padding: 20, gap: 16 }}>
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

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function StoryDetailScreen() {
  const {
    router,
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

  useBackHandler(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/stories');
  });

  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const handleOpenFile = async (url?: string) => {
    if (url) await WebBrowser.openBrowserAsync(url);
  };

  // ── Split image attachments by type ──────────────────────────────────────
  const imgOnly = imageAttachments.filter(a => !a.type?.startsWith('video/'));
  const videos  = imageAttachments.filter(a =>  a.type?.startsWith('video/'));

  // All previewable media: images + videos + audio
  const allPreviewAttachments = [...imageAttachments, ...audioAttachments];

  // Mosaic grid: row1 = [0, 1], row2 = [2, 3, 4], rest hidden with "+N"
  const MAX_SHOWN = 5;
  const shownImgs = imgOnly.slice(0, MAX_SHOWN);
  const extraCount = Math.max(0, imgOnly.length - MAX_SHOWN);
  const row1 = shownImgs.slice(0, 2);
  const row2 = shownImgs.slice(2, 5);

  const openPreview = (item: typeof allPreviewAttachments[0]) => {
    const idx = allPreviewAttachments.findIndex(a => a.url === item.url);
    setPreviewIndex(idx >= 0 ? idx : 0);
    setPreviewVisible(true);
    Haptics.selectionAsync();
  };

  // ── Tag display ───────────────────────────────────────────────────────────
  const MAX_TAGS = 3;
  const visibleTags = (memory?.tags ?? []).slice(0, MAX_TAGS);
  const extraTags = Math.max(0, (memory?.tags?.length ?? 0) - MAX_TAGS);

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
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 15, color: COLORS.textWeak }}>Memory not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); if (router.canGoBack()) router.back(); else router.replace('/(tabs)/stories'); }}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={COLORS.textBase} strokeWidth={2} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* Edit pill */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleEdit(); }}
          style={styles.editPill}
          activeOpacity={0.8}
        >
          <Pencil size={14} color={COLORS.textBase} strokeWidth={2} />
          <Text style={styles.editLabel}>Edit</Text>
        </TouchableOpacity>

        {/* Actions menu */}
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); handleOpenActions(); }} style={styles.iconBtn} activeOpacity={0.7}>
          <MoreHorizontal size={20} color={COLORS.textBase} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Title ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 }}>
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
                <CalendarDays size={14} color={COLORS.info} strokeWidth={1.8} />
                <Text style={styles.dateText}>{dayjs(memory.created_at).format('ddd, MMM D')}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Image mosaic ── */}
        {imgOnly.length > 0 && (
          <View style={{ paddingHorizontal: 20, gap: 6, marginBottom: 8 }}>
            {/* Row 1: wide + narrow */}
            {row1.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 6, height: 200 }}>
                {row1.map((item, idx) => {
                  const isWide = idx === 0;
                  return (
                    <TouchableOpacity
                      key={item.url ?? idx}
                      activeOpacity={0.88}
                      onPress={() => openPreview(item)}
                      style={{
                        flex: isWide ? 1.7 : 1,
                        borderRadius: 14,
                        overflow: 'hidden',
                        backgroundColor: COLORS.fillWeak,
                      }}
                    >
                      <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Row 2: 3 equal squares, last gets "+N more" overlay */}
            {row2.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {row2.map((item, idx) => {
                  const isLast = idx === row2.length - 1 && idx === 2;
                  const showMore = isLast && extraCount > 0;
                  return (
                    <TouchableOpacity
                      key={item.url ?? idx}
                      activeOpacity={0.88}
                      onPress={() => openPreview(item)}
                      style={{ flex: 1, aspectRatio: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.fillWeak }}
                    >
                      <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      {showMore && (
                        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.52)', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontFamily: FONTS.sansBold, fontSize: 18, color: '#fff' }}>+{extraCount} more</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Videos — real extracted thumbnail + play button via VideoThumbnail */}
        {videos.length > 0 && (
          <View style={{ paddingHorizontal: 20, gap: 8, marginBottom: 8 }}>
            {videos.map((item, idx) => (
              <VideoThumbnail
                key={item.url ?? idx}
                uri={item.url ?? ''}
                width={SCREEN_W - 40}
                height={(SCREEN_W - 40) * (9 / 16)}
                onPress={() => openPreview(item)}
              />
            ))}
          </View>
        )}

        {/* Audio — tappable music/voice card thumbnails → opens MediaPreviewModal */}
        {audioAttachments.length > 0 && (
          <View style={{ paddingHorizontal: 20, gap: 8, marginBottom: 8 }}>
            {audioAttachments.map((item) => {
              const isVoice = item.name?.startsWith('voice_') && item.type === 'audio/m4a';
              const albumArt = item.thumbnail;
              const dur = Number((item as any).duration ?? 0);
              const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
              const rawFileName = item.name
                ? item.name.replace(/\.[^.]+$/, '').replace(/_\d{12,}$/, '').replace(/_/g, ' ')
                : 'Audio';
              // Prefer the AI-generated memory title over the raw filename
              const fileName = memory.title && memory.title !== 'Untitled Memory' ? memory.title : rawFileName;

              if (albumArt) {
                // Album art card (future — when backend extracts ID3 art)
                return (
                  <TouchableOpacity
                    key={item._id}
                    onPress={() => openPreview(item)}
                    activeOpacity={0.88}
                    style={{ borderRadius: 16, overflow: 'hidden', height: 120 }}
                  >
                    <Image source={{ uri: albumArt }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.45)' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 14 }}>
                        {[5, 10, 14, 11, 7, 12, 8, 14].map((h, i) => <View key={i} style={{ width: 2.5, height: h, backgroundColor: COLORS.brand, borderRadius: 2 }} />)}
                      </View>
                      <Text style={{ fontFamily: FONTS.sansBold, fontSize: 12, color: '#fff', flex: 1 }} numberOfLines={1}>{fileName}</Text>
                      {dur > 0 && <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{fmt(dur)}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              }

              if (isVoice) {
                // Dark voice card — square, half-width, matching MP3 card style
                let h = 0;
                const seed = item._id || item.name || '';
                for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
                const bars = Array.from({ length: 16 }, (_, i) =>
                  4 + Math.round((Math.sin((Math.abs(h) + i * 997) * 0.013) * 0.5 + 0.5) * 20)
                );
                return (
                  <TouchableOpacity
                    key={item._id}
                    onPress={() => openPreview(item)}
                    activeOpacity={0.88}
                    style={{ backgroundColor: COLORS.textStrong, borderRadius: 20, aspectRatio: 1, width: (SCREEN_W - 40) / 2, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 32 }}>
                      {bars.map((barH, i) => (
                        <View key={i} style={{ flex: 1, height: barH, borderRadius: 2, backgroundColor: `${COLORS.brand}cc`, maxHeight: 28 }} />
                      ))}
                    </View>
                    <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 12, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }} numberOfLines={2}>
                      {fileName}
                    </Text>
                    {dur > 0 && (
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ fontFamily: FONTS.sansBold, fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{fmt(dur)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }

              // Clean music player card for uploaded MP3/WAV/AAC — square card matching masonry
              return (
                <TouchableOpacity
                  key={item._id}
                  onPress={() => openPreview(item)}
                  activeOpacity={0.88}
                  style={{ backgroundColor: COLORS.fillWeak, borderRadius: 20, aspectRatio: 1, width: (SCREEN_W - 40) / 2, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}
                >
                  {/* Orange waveform bars */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 32 }}>
                    {[8, 16, 24, 20, 12, 22, 14, 24, 18, 8, 16, 24].map((h, i) => (
                      <View key={i} style={{ width: 3, height: h, backgroundColor: COLORS.brand, borderRadius: 2 }} />
                    ))}
                  </View>
                  <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 12, color: COLORS.textStrong, textAlign: 'center' }} numberOfLines={2}>{fileName}</Text>
                  {dur > 0 && (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: FONTS.sansBold, fontSize: 11, color: COLORS.textBase }}>{fmt(dur)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Body ── */}
        {memory.body ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            <StoryHtmlBody html={memory.body} />
          </View>
        ) : null}

        {/* ── Other attachments (documents only) ── */}
        {otherAttachments.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 8 }}>
            <Text style={styles.sectionLabel}>DOCUMENTS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {otherAttachments.map(a => {
                const fileType = a.type?.split('/')[1]?.toUpperCase() ?? 'FILE';
                const fileSize = ((a as any).size && Number((a as any).size) > 0)
                  ? `${(Number((a as any).size) / 1024 / 1024).toFixed(1)} MB`
                  : null;
                return (
                  <TouchableOpacity
                    key={a._id}
                    onPress={() => handleOpenFile(a.url)}
                    activeOpacity={0.88}
                    style={{ backgroundColor: COLORS.fillWeak, borderRadius: 20, aspectRatio: 1, width: (SCREEN_W - 40) / 2, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 }}
                  >
                    <View style={{ width: 48, height: 48, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.strokeWeaker, alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={24} color={COLORS.brand} strokeWidth={1.5} />
                    </View>
                    <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 12, color: COLORS.textStrong, textAlign: 'center' }} numberOfLines={2}>
                      {a.name || 'Document'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ backgroundColor: `${COLORS.brand}15`, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontFamily: FONTS.sansBold, fontSize: 10, color: COLORS.brand }}>{fileType}</Text>
                      </View>
                      {fileSize && <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: COLORS.textMuted }}>{fileSize}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Full-screen media previewer — images, videos, and audio */}
      <MediaPreviewModal
        visible={previewVisible}
        attachments={allPreviewAttachments.map(a => {
          const isAudio = a.type?.startsWith('audio/');
          const audioTitle = memory.title && memory.title !== 'Untitled Memory' ? memory.title : undefined;
          return {
            clientId: a._id ?? (a.url ?? ''),
            uri: a.url ?? '',
            // For audio attachments, use the AI-generated memory title as the display name
            name: (isAudio && audioTitle) ? audioTitle : (a.name ?? ''),
            mimeType: a.type ?? 'application/octet-stream',
            duration: (a as any).duration,
            isVoice: a.name?.startsWith('voice_') && a.type === 'audio/m4a',
            thumbnailUrl: (a as any).thumbnail ?? null,
          };
        })}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  editPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    height: 36, paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
  },
  editLabel: {
    fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textBase,
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 30,
    lineHeight: 38,
    color: COLORS.textStrong,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
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
  tagText: {
    fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.textBase,
  },
  dateRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5,
  },
  dateText: {
    fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.textBase,
  },
  body: {
    fontFamily: FONTS.sans,
    fontSize: 17,
    lineHeight: 28,
    color: COLORS.textStrong,
  },
  sectionLabel: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
};
