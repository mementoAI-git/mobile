/**
 * MediaPreviewModal — full-screen attachment previewer
 *
 * - Horizontal paged FlatList through ALL attachments
 * - Images: full-width contain
 * - Videos: play icon → Linking.openURL (native player)
 * - Audio / Voice: waveform card + duration
 * - Documents: file icon + filename
 * - "X / Y" counter, close button top-right, trash button top-left
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, Play, Mic, FileText, Music, Trash2 } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';

const { width: SCREEN_W } = Dimensions.get('window');

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

function ImagePage({ uri }: { uri: string }) {
  return (
    <View style={styles.page}>
      <Image source={{ uri }} style={styles.fullImage} resizeMode="contain" />
    </View>
  );
}

function VideoPage({ uri, name }: { uri: string; name: string }) {
  const handlePlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(uri).catch(() => {});
  };
  return (
    <View style={styles.page}>
      <TouchableOpacity onPress={handlePlay} activeOpacity={0.8} style={styles.mediaCard}>
        <View style={styles.iconCircle}>
          <Play size={36} color={COLORS.textInverse} fill={COLORS.textInverse} />
        </View>
        <Text style={styles.mediaName} numberOfLines={2}>{name}</Text>
        <Text style={styles.mediaHint}>Tap to play</Text>
      </TouchableOpacity>
    </View>
  );
}

function AudioPage({ item }: { item: PreviewAttachment }) {
  const dur = item.duration ?? 0;
  return (
    <View style={styles.page}>
      <View style={[styles.mediaCard, { backgroundColor: COLORS.textStrong }]}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Mic size={32} color={COLORS.textInverse} strokeWidth={1.8} />
        </View>
        <Text style={[styles.mediaName, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={2}>
          {item.isVoice ? 'Voice note' : item.name}
        </Text>
        {dur > 0 && (
          <Text style={[styles.mediaHint, { color: 'rgba(255,255,255,0.5)' }]}>
            {formatDuration(dur)}
          </Text>
        )}
      </View>
    </View>
  );
}

function DocPage({ item }: { item: PreviewAttachment }) {
  const isAudio = item.mimeType.startsWith('audio/');
  const Icon = isAudio ? Music : FileText;
  return (
    <View style={styles.page}>
      <View style={styles.mediaCard}>
        <View style={[styles.iconCircle, { backgroundColor: `${COLORS.brand}18` }]}>
          <Icon size={32} color={COLORS.brand} strokeWidth={1.8} />
        </View>
        <Text style={styles.mediaName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.mediaHint}>{item.mimeType.split('/')[1]?.toUpperCase() ?? 'FILE'}</Text>
      </View>
    </View>
  );
}

function renderPage(item: PreviewAttachment) {
  if (item.mimeType.startsWith('image/')) return <ImagePage uri={item.uri} />;
  if (item.mimeType.startsWith('video/')) return <VideoPage uri={item.uri} name={item.name} />;
  if (item.mimeType.startsWith('audio/') || item.isVoice) return <AudioPage item={item} />;
  return <DocPage item={item} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MediaPreviewModal({ visible, attachments, initialIndex = 0, onClose, onRemove }: Props) {
  const listRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      const t = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [visible, initialIndex]);

  const handleViewableChange = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const item = attachments[currentIndex];
    if (!item || !onRemove) return;
    Alert.alert('Remove attachment', 'Remove this item from your post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onRemove(item.clientId);
          if (attachments.length <= 1) onClose();
        },
      },
    ]);
  };

  if (!attachments.length) return null;

  const total = attachments.length;
  const display = Math.min(currentIndex + 1, total);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* ── Top bar: trash (left), counter (center), close (right) ── */}
        <View style={styles.topBar}>
          {/* Trash button — design system destructive style */}
          {onRemove ? (
            <TouchableOpacity
              onPress={handleRemove}
              style={styles.trashBtn}
              activeOpacity={0.8}
            >
              <Trash2 size={18} color={COLORS.error} strokeWidth={2} />
            </TouchableOpacity>
          ) : (
            <View style={styles.btnPlaceholder} />
          )}

          {/* Counter pill */}
          <View style={styles.counter}>
            <Text style={styles.counterText}>{display} / {total}</Text>
          </View>

          {/* Close button */}
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); onClose(); }}
            style={styles.closeBtn}
            activeOpacity={0.8}
          >
            <X size={18} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* ── Paging list ── */}
        <FlatList
          ref={listRef}
          data={attachments}
          keyExtractor={(item) => item.clientId}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={handleViewableChange}
          viewabilityConfig={viewabilityConfig.current}
          getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
          renderItem={({ item }) => renderPage(item)}
          initialScrollIndex={initialIndex}
          onScrollToIndexFailed={() => {}}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.93)',
  },

  // ── Top bar ──────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // Trash — visible on dark background
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnPlaceholder: {
    width: 36,
    height: 36,
  },

  // Counter pill
  counter: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  counterText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: '#ffffff',
  },

  // Close — visible on dark background
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Pages ────────────────────────────────────────────────────────────────────
  page: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fullImage: {
    width: SCREEN_W,
    flex: 1,
  },

  // Card for non-image types
  mediaCard: {
    width: SCREEN_W - 64,
    borderRadius: 24,
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.brand}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaName: {
    fontFamily: FONTS.sansMedium,
    fontSize: 16,
    color: COLORS.textStrong,
    textAlign: 'center',
  },
  mediaHint: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
