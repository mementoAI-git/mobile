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
  FileText, Download, Music, CalendarDays,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import Animated from 'react-native-reanimated';
import { VideoView } from 'expo-video';
import { useVideoPlayer } from '@/hooks/use-video-player';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { MemTag, Skeleton } from '@/components/ui';
import { MediaPreviewModal } from '@/components/ui/MediaPreviewModal';
import { COLORS, FONTS } from '@/constants/tokens';
import { useStoryDetailLogic } from '@/hooks/use-story-detail-logic';
import { useBackHandler } from '@/hooks/use-back-handler';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Video item ───────────────────────────────────────────────────────────────

function VideoItem({ uri, style }: { uri: string; style?: any }) {
  const { player } = useVideoPlayer(uri, { loop: false, autoPlay: false });
  return (
    <VideoView
      player={player}
      style={style ?? { width: '100%', aspectRatio: 16 / 9 }}
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
    />
  );
}

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

  // Mosaic grid: row1 = [0, 1], row2 = [2, 3, 4], rest hidden with "+N"
  const MAX_SHOWN = 5;
  const shownImgs = imgOnly.slice(0, MAX_SHOWN);
  const extraCount = Math.max(0, imgOnly.length - MAX_SHOWN);
  const row1 = shownImgs.slice(0, 2);
  const row2 = shownImgs.slice(2, 5);

  const openPreview = (item: typeof imgOnly[0]) => {
    const idx = imageAttachments.findIndex(a => a.url === item.url);
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

        {/* Videos — full-width stacked */}
        {videos.length > 0 && (
          <View style={{ paddingHorizontal: 20, gap: 8, marginBottom: 8 }}>
            {videos.map((item, idx) => (
              <View key={item.url ?? idx} style={{ borderRadius: 14, overflow: 'hidden' }}>
                <VideoItem uri={item.url || ''} style={{ width: '100%', aspectRatio: 16 / 9 }} />
              </View>
            ))}
          </View>
        )}

        {/* ── Body ── */}
        {(memory.body?.replace(/<[^>]+>/g, '').trim() ?? '').length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            <Text style={styles.body}>
              {memory.body?.replace(/<[^>]+>/g, '') ?? ''}
            </Text>
          </View>
        )}

        {/* ── Other attachments ── */}
        {otherAttachments.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 8 }}>
            <Text style={styles.sectionLabel}>ATTACHMENTS</Text>
            {otherAttachments.map(a => {
              const isVoice = a.name?.startsWith('voice_') ?? false;
              const isAudio = a.type?.startsWith('audio/');

              if (isVoice) {
                let h = 0;
                const seed = a._id || a.name || '';
                for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
                const bars = Array.from({ length: 24 }, (_, i) =>
                  4 + Math.round((Math.sin((Math.abs(h) + i * 997) * 0.013) * 0.5 + 0.5) * 16)
                );
                const dur = Number((a as any).duration ?? 0);
                const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
                return (
                  <View key={a._id} style={{ backgroundColor: COLORS.textStrong, borderRadius: 16, padding: 14 }}>
                    <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 10 }} numberOfLines={1}>
                      Voice note{dur > 0 ? ` · ${fmt(dur)}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                      {bars.map((barH, i) => (
                        <View key={i} style={{ flex: 1, height: barH, borderRadius: 2, backgroundColor: `${COLORS.brand}99`, maxHeight: 24 }} />
                      ))}
                    </View>
                  </View>
                );
              }

              if (isAudio) {
                return (
                  <TouchableOpacity key={a._id} onPress={() => handleOpenFile(a.url)} activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.fillWeak, borderRadius: 12, borderWidth: 1, borderColor: COLORS.strokeWeaker, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <Music size={18} color={COLORS.brand} strokeWidth={1.8} />
                    <Text style={{ flex: 1, fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.textStrong }} numberOfLines={1}>{a.name || 'Audio file'}</Text>
                    <Download size={16} color={COLORS.brand} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity key={a._id} onPress={() => handleOpenFile(a.url)} activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.fillWeak, borderWidth: 1, borderColor: COLORS.strokeWeaker, padding: 12, borderRadius: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={{ width: 40, height: 40, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.strokeWeaker, alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} color={COLORS.textBase} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.textStrong }} numberOfLines={1}>{a.name || 'Document'}</Text>
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textWeak, textTransform: 'uppercase' }}>
                        {a.type?.split('/')[1]?.toUpperCase() ?? 'FILE'}{((a as any).size && Number((a as any).size) > 0) ? ` · ${(Number((a as any).size) / 1024 / 1024).toFixed(2)} MB` : ''}
                      </Text>
                    </View>
                  </View>
                  <Download size={18} color={COLORS.brand} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Full-screen image previewer */}
      <MediaPreviewModal
        visible={previewVisible}
        attachments={imageAttachments.map(a => ({
          clientId: a._id ?? (a.url ?? ''),
          uri: a.url ?? '',
          name: a.name ?? '',
          mimeType: a.type ?? 'image/jpeg',
        }))}
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
    fontFamily: FONTS.sansBold,
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
