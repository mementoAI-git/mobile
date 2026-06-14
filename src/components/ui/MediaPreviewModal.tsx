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

import React, { useRef, useCallback, useState } from 'react';
import {
  View, Text, Modal, FlatList, Image,
  TouchableOpacity, TouchableWithoutFeedback, Dimensions,
  StyleSheet, Share,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { VideoView } from 'expo-video';
import { useVideoPlayer } from '@/hooks/use-video-player';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Share2, X, Mic, FileText, Music } from 'lucide-react-native';
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

function ImageSlide({ uri }: { uri: string }) {
  return (
    <View style={styles.slide}>
      {/* flex: 1 + contain — image fills the card height without cropping,
          letterboxed on the cream background for any aspect ratio */}
      <Image
        source={{ uri }}
        style={styles.slideImage}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * VideoSlide — uses expo-video for in-app playback.
 *
 * useVideoPlayer must be called at the component top level (Rules of Hooks),
 * so VideoSlide is its own component rather than an inline renderer.
 *
 * uri preference: CDN URL (post-upload) → local file:// (during upload)
 */
function VideoSlide({ uri }: { uri: string }) {
  const { player } = useVideoPlayer(uri, { autoPlay: false, loop: false });
  return (
    <View style={styles.slide}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <VideoView
          player={player}
          nativeControls
          style={styles.roundedImage}
          allowsFullscreen
          allowsPictureInPicture
        />
      </View>
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

function renderSlide(item: PreviewAttachment) {
  if (item.mimeType.startsWith('image/')) return <ImageSlide uri={item.uri} />;
  if (item.mimeType.startsWith('video/')) return <VideoSlide uri={item.uri} />;
  if (item.mimeType.startsWith('audio/') || item.isVoice) return <AudioSlide item={item} />;
  return <DocSlide item={item} />;
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

// ─── Main component ───────────────────────────────────────────────────────────

export function MediaPreviewModal({ visible, attachments, initialIndex = 0, onClose, onRemove }: Props) {
  const listRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      const t = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [visible, initialIndex]);

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

  if (!attachments.length) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* SafeAreaProvider scoped to the Modal window — fixes inset delivery
          on Android edge-to-edge (edgeToEdgeEnabled: true in app.json)
          which causes the header to be hidden behind the status bar on first open */}
      <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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

        {/* ── Paging list — TouchableWithoutFeedback wraps the flex:1 area so
            tapping the cream space above/below the image card closes the modal ── */}
        <TouchableWithoutFeedback onPress={() => { Haptics.selectionAsync(); onClose(); }}>
          <View style={{ flex: 1 }}>
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
              renderItem={({ item }) => renderSlide(item)}
              initialScrollIndex={initialIndex}
              onScrollToIndexFailed={() => {}}
              style={{ flex: 1 }}
            />
          </View>
        </TouchableWithoutFeedback>

        {/* ── Dot pagination ── */}
        <Dots count={attachments.length} active={currentIndex} />
      </SafeAreaView>
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
