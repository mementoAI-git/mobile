/**
 * MediaPreviewModal — full-screen attachment previewer
 *
 * Design:
 *  - Cream background (COLORS.background)
 *  - Header: ← back | Share pill | × close
 *  - Images: rounded corners, horizontal padding, peek of next image
 *  - Media vertically centered
 *  - Dot pagination — brand orange active, stroke-weak inactive
 *  - Horizontal swipe between attachments
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View, Text, Modal, FlatList, Image,
  TouchableOpacity, Dimensions, Animated,
  StyleSheet, Share, ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView } from 'expo-video';
import { useVideoPlayer } from '@/hooks/use-video-player';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Share2, X, Mic, FileText, Music, Play } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';

const { width: SCREEN_W } = Dimensions.get('window');

// Horizontal padding on each side — creates the "peek" effect
const SIDE_PAD = 24;
// Gap between cards
const CARD_GAP = 12;
// Effective card width
const CARD_W = SCREEN_W - SIDE_PAD * 2;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreviewAttachment {
  clientId: string;
  uri: string;
  name: string;
  mimeType: string;
  duration?: number;
  isVoice?: boolean;
}

interface Props {
  visible: boolean;
  attachments: PreviewAttachment[];
  initialIndex?: number;
  onClose: () => void;
  onRemove?: (clientId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Per-item renderers ───────────────────────────────────────────────────────

function ImageSlide({ uri, onClose }: { uri: string; onClose: () => void }) {
  return (
    // Tapping the image (or the cream area around it) closes the modal
    <TouchableOpacity style={styles.slide} onPress={() => { Haptics.selectionAsync(); onClose(); }} activeOpacity={1}>
      <Image
        source={{ uri }}
        style={styles.slideImage}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}

/**
 * VideoSlide — minimal custom player.
 *
 * Layout matches ImageSlide exactly: VideoView fills the full slide card.
 * No native controls — custom overlay with:
 *  • Tap anywhere → play/pause + brief icon flash
 *  • Thin brand-orange progress bar at the bottom edge
 */
const SPEEDS = [1, 1.5, 2, 0.5] as const;

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function VideoSlide({ uri, isActive }: { uri: string; isActive: boolean }) {
  const { player, play, pause } = useVideoPlayer(uri, { autoPlay: false, loop: false });

  // Pause when the slide scrolls out of view
  useEffect(() => {
    if (!isActive && player.playing) {
      pause();
    }
  }, [isActive, player, pause]);


  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = duration > 0 ? currentTime / duration : 0;
  const ended = progress >= 0.99;

  // Poll every 250ms
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentTime(player.currentTime ?? 0);
      setDuration(player.duration ?? 0);
      setPlaying(player.playing ?? false);
    }, 250);
    return () => clearInterval(id);
  }, [player]);

  // Show controls and schedule auto-hide
  const showControls = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(controlsOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(controlsOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    }, 3000);
  }, [controlsOpacity]);

  const handleTap = useCallback(() => {
    Haptics.selectionAsync();
    if (ended) {
      player.seekBy(-(player.currentTime ?? 0));
      play();
    } else if (player.playing) {
      pause();
    } else {
      play();
    }
    showControls();
  }, [ended, player, play, pause, showControls]);

  const handleSpeedTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    player.playbackRate = SPEEDS[next];
    // preservesPitch prevents the chipmunk pitch-shift effect when speeding up
    player.preservesPitch = true;
    showControls();
  }, [speedIdx, player, showControls]);

  // Seek on progress bar tap
  const progressBarRef = useRef<View>(null);
  const handleSeek = useCallback((e: any) => {
    progressBarRef.current?.measure((_x, _y, width) => {
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / width));
      player.seekBy((ratio * duration) - (player.currentTime ?? 0));
      showControls();
    });
  }, [player, duration, showControls]);

  return (
    <View style={styles.slide}>
      {/* VideoView — no native controls */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        nativeControls={false}
      />

      {/* Tap overlay — play/pause/replay */}
      <TouchableOpacity onPress={handleTap} activeOpacity={0.9} style={StyleSheet.absoluteFillObject}>
        {duration === 0 ? (
          // Video not yet loaded — show spinner
          <View style={styles.videoPlayBtn}>
            <ActivityIndicator size="large" color={COLORS.brand} />
          </View>
        ) : !playing ? (
          // Loaded, paused — show play button
          <View style={styles.videoPlayBtn}>
            <Play size={32} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 4 }} />
          </View>
        ) : null}
      </TouchableOpacity>

      {/* WhatsApp-style bottom control bar */}
      <Animated.View style={[styles.videoControls, { opacity: controlsOpacity }]}>
        <Text style={styles.videoTimeText}>{fmt(currentTime)}</Text>

        {/* Progress bar — tappable */}
        <TouchableOpacity
          ref={progressBarRef as any}
          onPress={handleSeek}
          activeOpacity={1}
          style={styles.videoProgressTrack}
        >
          <View style={[styles.videoProgressFilled, { width: `${Math.round(progress * 100)}%` as any }]} />
          <View style={[styles.videoProgressDot, { left: `${Math.round(progress * 100)}%` as any }]} />
        </TouchableOpacity>

        <Text style={styles.videoTimeText}>{fmt(duration)}</Text>

        {/* Speed pill */}
        <TouchableOpacity onPress={handleSpeedTap} activeOpacity={0.8} style={styles.videoSpeedPill}>
          <Text style={styles.videoSpeedText}>{SPEEDS[speedIdx]}×</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function AudioSlide({ item }: { item: PreviewAttachment }) {
  const dur = item.duration ?? 0;
  return (
    <View style={styles.slide}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={[styles.roundedImage, styles.mediaCard]}>
          <View style={[styles.iconCircle, { backgroundColor: `${COLORS.brand}18` }]}>
            <Mic size={32} color={COLORS.brand} strokeWidth={1.8} />
          </View>
          <Text style={[styles.mediaName, { color: COLORS.textStrong }]} numberOfLines={2}>
            {item.isVoice ? 'Voice note' : item.name}
          </Text>
          {dur > 0 && <Text style={styles.mediaHint}>{formatDuration(dur)}</Text>}
        </View>
      </View>
    </View>
  );
}

function DocSlide({ item }: { item: PreviewAttachment }) {
  const isAudio = item.mimeType.startsWith('audio/');
  const Icon = isAudio ? Music : FileText;
  return (
    <View style={styles.slide}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={[styles.roundedImage, styles.mediaCard]}>
          <View style={[styles.iconCircle, { backgroundColor: `${COLORS.brand}18` }]}>
            <Icon size={32} color={COLORS.brand} strokeWidth={1.8} />
          </View>
          <Text style={[styles.mediaName, { color: COLORS.textStrong }]} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.mediaHint}>{item.mimeType.split('/')[1]?.toUpperCase() ?? 'FILE'}</Text>
        </View>
      </View>
    </View>
  );
}

function makeRenderSlide(onClose: () => void, currentIndex: number, attachments: PreviewAttachment[]) {
  return function renderSlide({ item, index }: { item: PreviewAttachment; index: number }) {
    const isActive = index === currentIndex;
    if (item.mimeType.startsWith('image/')) return <ImageSlide uri={item.uri} onClose={onClose} />;
    if (item.mimeType.startsWith('video/')) return <VideoSlide uri={item.uri} isActive={isActive} />;
    if (item.mimeType.startsWith('audio/') || item.isVoice) return <AudioSlide item={item} />;
    return <DocSlide item={item} />;
  };
}

// ─── Dot indicator ────────────────────────────────────────────────────────────

function Dots({ count, active }: { count: number; active: number }) {
  if (count <= 1) return null;
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === active
              ? { backgroundColor: COLORS.brand, width: 10, height: 10 }
              : { backgroundColor: COLORS.strokeWeak, width: 8, height: 8 },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Modal inner — reads insets from the scoped SafeAreaProvider ──────────────

function ModalInner({ attachments, initialIndex, onClose, onRemove }: Omit<Props, 'visible' | 'initialIndex'> & { initialIndex: number }) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [initialIndex]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });
  const handleViewableChange = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  }, []);

  const handleShare = useCallback(async () => {
    Haptics.selectionAsync();
    const item = attachments[currentIndex];
    if (!item) return;
    try {
      await Share.share({ url: item.uri, message: item.name });
    } catch {}
  }, [attachments, currentIndex]);

  const renderSlide = useCallback(
    makeRenderSlide(onClose, currentIndex, attachments),
    [onClose, currentIndex, attachments],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onClose(); }} style={styles.iconBtn} activeOpacity={0.8}>
          <ChevronLeft size={20} color={COLORS.textBase} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={styles.sharePill} activeOpacity={0.8}>
          <Share2 size={14} color={COLORS.textBase} strokeWidth={2} />
          <Text style={styles.shareLabel}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onClose(); }} style={styles.iconBtn} activeOpacity={0.8}>
          <X size={18} color={COLORS.textBase} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={() => { Haptics.selectionAsync(); onClose(); }}
          activeOpacity={1}
        />
        <FlatList
          ref={listRef}
          data={attachments}
          keyExtractor={(item) => item.clientId}
          horizontal
          pagingEnabled={false}
          snapToInterval={CARD_W + CARD_GAP}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SIDE_PAD }}
          ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
          onViewableItemsChanged={handleViewableChange}
          viewabilityConfig={viewabilityConfig.current}
          getItemLayout={(_, index) => ({ length: CARD_W + CARD_GAP, offset: (CARD_W + CARD_GAP) * index, index })}
          renderItem={({ item, index }) => renderSlide({ item, index })}
          initialScrollIndex={initialIndex}
          onScrollToIndexFailed={() => {}}
          style={{ flex: 1 }}
        />
      </View>

      <Dots count={attachments.length} active={currentIndex} />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MediaPreviewModal({ visible, attachments, initialIndex = 0, onClose, onRemove }: Props) {
  if (!attachments.length) return null;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* SafeAreaProvider scoped to the Modal window — gives useSafeAreaInsets
          correct values for the modal's own native window. Plain View (not
          SafeAreaView) fills inset zones with COLORS.background — no dark bands. */}
      <SafeAreaProvider>
        <ModalInner
          attachments={attachments}
          initialIndex={initialIndex}
          onClose={onClose}
          onRemove={onRemove}
        />
      </SafeAreaProvider>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
    alignItems: 'center', justifyContent: 'center',
  },
  sharePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 36, paddingHorizontal: 16, borderRadius: 18,
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
  },
  shareLabel: {
    fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.textBase,
  },

  // Slides
  slide: {
    width: CARD_W,
    flex: 1,
  },
  // Image slide — flex:1 + contain shows the full image at its natural ratio
  // without any cropping, letterboxed on the cream background
  slideImage: {
    flex: 1,
    width: '100%',
    borderRadius: 24,
  },
  roundedImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    overflow: 'hidden',
  },

  // Non-image card
  mediaCard: {
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${COLORS.brand}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  mediaName: {
    fontFamily: FONTS.sansMedium, fontSize: 16,
    color: COLORS.textStrong, textAlign: 'center',
  },
  mediaHint: {
    fontFamily: FONTS.sans, fontSize: 13,
    color: COLORS.textMuted, textAlign: 'center',
  },

  // WhatsApp-style bottom control bar — no background, text shadow for readability
  videoControls: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  videoTimeText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    color: COLORS.textStrong,
    minWidth: 36,
    textAlign: 'center',
  },
  videoProgressTrack: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  videoProgressFilled: {
    height: 3,
    backgroundColor: COLORS.brand,
    borderRadius: 2,
  },
  videoProgressDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    top: '50%',
    marginTop: -5,
    marginLeft: -5,
  },
  videoSpeedPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.brand,
  },
  videoSpeedText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
    color: COLORS.textStrong,
  },

  // Video play button (shown when paused/ended)
  videoPlayBtn: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Video player custom controls
  videoIconFlash: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 24,
  },
  videoProgressBg: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  videoProgressFill: {
    height: 3,
    backgroundColor: COLORS.brand,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  dot: {
    borderRadius: 999,
  },
});
