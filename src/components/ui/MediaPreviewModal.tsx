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

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, FlatList,
  TouchableOpacity, Dimensions, Animated as RNAnimated,
  StyleSheet, Share, ActivityIndicator, Image, ImageBackground, Platform, Alert,
} from 'react-native';
// Type-only import: erased at compile time, never triggers the native module
// lookup — safe to keep even when the real package isn't usable (Expo Go).
import type * as MediaLibraryType from 'expo-media-library';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import { useVideoPlayer } from '@/hooks/use-video-player';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, cancelAnimation } from 'react-native-reanimated';
import { ChevronLeft, Share2, X, Mic, FileText, Music, Play, Pause, RotateCcw, Link2, Download } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import { publishedPostUrl } from '@/lib/env';

const { width: SCREEN_W } = Dimensions.get('window');

// Horizontal padding on each side — creates the "peek" effect
const SIDE_PAD = 24;
// Gap between cards
const CARD_GAP = 12;
// Effective card width
const CARD_W = SCREEN_W - SIDE_PAD * 2;

const isExpoGo = Constants.appOwnership === 'expo';

// Lazily require the real module only when we're NOT in Expo Go — this
// prevents ExpoMediaLibraryNext's native-module lookup from ever firing
// under Expo Go, which is what was crashing on import before.
function getMediaLibrary(): typeof MediaLibraryType | null {
  if (isExpoGo) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('expo-media-library') as typeof MediaLibraryType;
}

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
  /** Parent memory ID — used to construct the share link */
  memoryId?: string;
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
    // ExpoImage is used instead of RN Image to correctly apply EXIF orientation
    // on Android — RN Image ignores EXIF rotation, ExpoImage respects it.
    <TouchableOpacity style={styles.slide}
      onPress={() => { Haptics.selectionAsync(); onClose(); }}
      activeOpacity={1}>
        <ExpoImage
          source={{ uri }}
          style={styles.slideImage}
          contentFit="contain"
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
  // autoPlay is handled via useEffect after mount — NOT in the player initializer.
  // This modal renders VideoView inside a horizontally snapping FlatList with
  // overlays. Android's default SurfaceView can fail to paint frames there, so
  // the view below opts into TextureView and starts playback after mount.
  const { player, play, pause } = useVideoPlayer(uri, { autoPlay: false, loop: false });

  // Start playback after <VideoView> has mounted and attached to the view hierarchy.
  // A short delay gives the modal window and native video view time to settle.
  useEffect(() => {
    if (!isActive) return;
    const t = setTimeout(() => {
      play();
    }, 50);
    return () => clearTimeout(t);
  // Only run when isActive changes from false→true (slide scrolled into view)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

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
  const controlsOpacity = useRef(new RNAnimated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = duration > 0 ? currentTime / duration : 0;
  const ended = progress >= 0.99;

  // Poll every 250ms to sync player state into React state
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
    RNAnimated.timing(controlsOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    hideTimer.current = setTimeout(() => {
      RNAnimated.timing(controlsOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
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
    // Keep a native parent for the Android video view inside the modal window.
    <View style={styles.slide} collapsable={false}>
      {/* VideoView — no native controls */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
        surfaceType="textureView"
      />

      {/* Tap overlay — play/pause/replay */}
      <TouchableOpacity onPress={handleTap} activeOpacity={0.9} style={StyleSheet.absoluteFill}>
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
      <RNAnimated.View style={[styles.videoControls, { opacity: controlsOpacity }]}>
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
      </RNAnimated.View>
    </View>
  );
}

const RECORD_BANNER_BG = require('../../../assets/images/backgrounds/record-banner.png');

function AudioSlide({ item, isActive }: { item: PreviewAttachment; isActive: boolean }) {
  const player = useAudioPlayer(item.uri);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(item.duration ?? 0);

  // Auto-pause when slide scrolls out of view
  useEffect(() => {
    if (!isActive && player.playing) {
      player.pause();
    }
  }, [isActive, player]);

  // Poll playback state every 250ms
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentTime(player.currentTime ?? 0);
      if (player.duration && player.duration > 0) setDuration(player.duration);
      setPlaying(player.playing ?? false);
    }, 250);
    return () => clearInterval(id);
  }, [player]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { player.pause(); } catch {}
    };
  }, [player]);

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const ended = progress >= 0.99;

  const handlePlayPause = useCallback(() => {
    Haptics.selectionAsync();
    if (ended) {
      player.seekTo(0);
      player.play();
    } else if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [ended, player]);

  const progressBarRef = useRef<View>(null);
  const handleSeek = useCallback((e: any) => {
    progressBarRef.current?.measure((_x, _y, width) => {
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / width));
      player.seekTo(ratio * duration);
    });
  }, [player, duration]);

  const displayName = item.isVoice ? 'Voice note' : (item.name?.replace(/\.[^.]+$/, '').replace(/_\d{12,}$/, '').replace(/_/g, ' ') ?? 'Audio');

  // Static bar heights (seeded so they're consistent per file)
  const staticBarHeights = useMemo(() => {
    const BAR_COUNT = 16;
    let seed = 0;
    const str = item.uri + (item.name ?? '');
    for (let i = 0; i < str.length; i++) seed = (seed * 31 + str.charCodeAt(i)) | 0;
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const s = Math.abs((seed + i * 6317) | 0);
      return 6 + (s % 26); // range 6–32px
    });
  }, [item.uri, item.name]);

  // One animated height per bar
  const barAnims = staticBarHeights.map(() => useSharedValue(1));

  // Start/stop animation based on playing state
  useEffect(() => {
    if (playing) {
      barAnims.forEach((anim, i) => {
        const min = 0.2;
        const max = 1;
        const duration = 300 + (i * 47) % 400; // 300–700ms, staggered
        anim.value = withRepeat(
          withSequence(
            withTiming(min + Math.random() * (max - min), { duration }),
            withTiming(min + Math.random() * (max - min), { duration }),
          ),
          -1,
          true,
        );
      });
    } else {
      barAnims.forEach((anim) => {
        cancelAnimation(anim);
        anim.value = withTiming(1, { duration: 200 });
      });
    }
  // barAnims is stable (same length/refs) — only react to playing changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const innerContent = (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 20 }}>
      {/* Animated waveform bars */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 36 }}>
        {staticBarHeights.map((h, i) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const animStyle = useAnimatedStyle(() => ({
            height: h * barAnims[i].value,
          }));
          return (
            <Animated.View
              key={i}
              style={[{ width: 3, borderRadius: 2, backgroundColor: COLORS.brand }, animStyle]}
            />
          );
        })}
      </View>

      {/* Track name */}
      <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 16, color: COLORS.textStrong, textAlign: 'center' }} numberOfLines={2}>
        {displayName}
      </Text>

      {/* Play/Pause button */}
      <TouchableOpacity
        onPress={handlePlayPause}
        activeOpacity={0.8}
        style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' }}
      >
        {ended
          ? <RotateCcw size={26} color="#fff" strokeWidth={2} />
          : playing
            ? <Pause size={26} color="#fff" fill="#fff" strokeWidth={0} />
            : <Play size={26} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 3 }} />
        }
      </TouchableOpacity>

      {/* Progress bar + times */}
      <View style={{ width: '100%', gap: 6 }}>
        <TouchableOpacity
          ref={progressBarRef as any}
          onPress={handleSeek}
          activeOpacity={1}
          style={{ height: 4, borderRadius: 2, backgroundColor: COLORS.strokeWeak }}
        >
          <View style={{ height: '100%', width: `${Math.round(progress * 100)}%`, borderRadius: 2, backgroundColor: COLORS.brand }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textWeak }}>{formatDuration(currentTime)}</Text>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textWeak }}>{formatDuration(duration)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.slide}>
      <View style={[styles.roundedImage, { overflow: 'hidden', justifyContent: 'center' }]}>
        {item.isVoice ? (
          <ImageBackground source={RECORD_BANNER_BG} style={{ flex: 1, justifyContent: 'center' }} resizeMode="cover" imageStyle={{ opacity: 0.7 }}>
            {innerContent}
          </ImageBackground>
        ) : (
          <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' }}>
            {innerContent}
          </View>
        )}
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

// Memoised slide wrappers — prevent VideoSlide/AudioSlide from remounting
// when the FlatList re-renders due to currentIndex state changes in ModalInner.
const MemoVideoSlide = React.memo(VideoSlide);
const MemoAudioSlide = React.memo(AudioSlide);

function makeRenderSlide(onClose: () => void, currentIndex: number, attachments: PreviewAttachment[]) {
  return function renderSlide({ item, index }: { item: PreviewAttachment; index: number }) {
    const isActive = index === currentIndex;
    if (item.mimeType.startsWith('image/')) return <ImageSlide uri={item.uri} onClose={onClose} />;
    if (item.mimeType.startsWith('video/')) return <MemoVideoSlide uri={item.uri} isActive={isActive} />;
    if (item.mimeType.startsWith('audio/') || item.isVoice) return <MemoAudioSlide item={item} isActive={isActive} />;
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

function ModalInner({ attachments, initialIndex, onClose, onRemove, memoryId }: Omit<Props, 'visible' | 'initialIndex'> & { initialIndex: number }) {
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
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      setCurrentIndex(idx);
    }
  }, []);

  const [shareMenuVisible, setShareMenuVisible] = useState(false);

  const handleShareButtonPress = useCallback(() => {
    Haptics.selectionAsync();
    setShareMenuVisible(true);
  }, []);

  const handleShareLink = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareMenuVisible(false);
    if (memoryId) {
      const url = publishedPostUrl(memoryId);
      await Clipboard.setStringAsync(url);
      // Also open native share with the link
      await Share.share({ url, message: url });
    }
  }, [memoryId]);

  const handleSaveToGallery = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareMenuVisible(false);

    const MediaLibrary = getMediaLibrary();
    if (!MediaLibrary) {
      // expo-media-library's native module isn't available in Expo Go.
      // Keep the action visible (not hidden) but explain why it can't run yet.
      Alert.alert(
        'Not available in Expo Go',
        'Saving to your gallery needs a development build. This will work once we move to EAS builds.',
      );
      return;
    }

    const item = attachments[currentIndex];
    if (!item) return;

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;

      // If the URI is remote (http/https), download it first
      let localUri = item.uri;
      if (item.uri.startsWith('http')) {
        const filename = item.name || `memento_${Date.now()}`;
        const downloadDest = `${FileSystem.cacheDirectory}${filename}`;
        const { uri } = await FileSystem.downloadAsync(item.uri, downloadDest);
        localUri = uri;
      }

      await MediaLibrary.saveToLibraryAsync(localUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Silent fail — user may have dismissed the permission dialog
    }
  }, [attachments, currentIndex]);

  const handleShareFile = useCallback(async () => {
    Haptics.selectionAsync();
    setShareMenuVisible(false);
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

  const renderItem = useCallback(
    ({ item, index }: { item: PreviewAttachment; index: number }) => renderSlide({ item, index }),
    [renderSlide],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onClose(); }} style={styles.iconBtn} activeOpacity={0.8}>
          <ChevronLeft size={20} color={COLORS.textBase} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShareButtonPress} style={styles.sharePill} activeOpacity={0.8}>
          <Share2 size={14} color={COLORS.textBase} strokeWidth={2} />
          <Text style={styles.shareLabel}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
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
          renderItem={renderItem}
          extraData={currentIndex}
          initialScrollIndex={initialIndex}
          onScrollToIndexFailed={() => {}}
          style={{ flex: 1 }}
        />
      </View>

      <Dots count={attachments.length} active={currentIndex} />

      {/* ── Custom share action panel ── */}
      <Modal
        visible={shareMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareMenuVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={() => { Haptics.selectionAsync(); setShareMenuVisible(false); }}
        />
        <View style={{
          backgroundColor: COLORS.background,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 40 : 24,
          paddingHorizontal: 24,
          gap: 8,
        }}>
          {/* Handle */}
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.strokeStrong, opacity: 0.3, alignSelf: 'center', marginBottom: 12 }} />

          {/* Share memory link — only when memoryId is provided */}
          {memoryId && (
            <TouchableOpacity
              onPress={handleShareLink}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 4 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
                <Link2 size={20} color={COLORS.textBase} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 15, color: COLORS.textStrong }}>Share memory link</Text>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textWeak, marginTop: 1 }}>Copy and share the public link</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Save to gallery */}
          <TouchableOpacity
            onPress={handleSaveToGallery}
            activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 4 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
              <Download size={20} color={COLORS.textBase} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 15, color: COLORS.textStrong }}>Save to gallery</Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textWeak, marginTop: 1 }}>Download this file to your device</Text>
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: COLORS.strokeWeaker, marginHorizontal: 4, marginVertical: 4 }} />

          {/* Share file via OS sheet */}
          <TouchableOpacity
            onPress={handleShareFile}
            activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 4 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={20} color={COLORS.textBase} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 15, color: COLORS.textStrong }}>Share file</Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textWeak, marginTop: 1 }}>Send via message, email or another app</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MediaPreviewModal({ visible, attachments, initialIndex = 0, onClose, onRemove, memoryId }: Props) {
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
          memoryId={memoryId}
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
