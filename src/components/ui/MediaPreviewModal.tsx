import { useThemeColors, useThemedStyles } from '@/hooks/use-theme-colors';
/**
 * MediaPreviewModal — full-screen attachment previewer
 *
 * Design:
 *  - Theme-adaptive backdrop (COLORS.mediaViewer) with raised header buttons
 *  - Header: default Share chrome or composer close-only chrome
 *  - Images: rounded corners, horizontal padding, peek of next image
 *  - Media vertically centered
 *  - Dot pagination — brand orange active, stroke-strong inactive
 *  - Horizontal swipe between attachments
 */

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  useWindowDimensions,
  Animated as RNAnimated,
  StyleSheet,
  Share,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
// Type-only import: erased at compile time, never triggers the native module
// lookup — safe to keep even when the real package isn't usable (Expo Go).
import type * as MediaLibraryType from 'expo-media-library/legacy';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView } from 'expo-video';
import { runtimeDiagnostics, sanitizeMediaUri } from '@/lib/runtime-diagnostics';
import { getMediaCategory, inferMediaMimeType } from '@/features/media/media-type';
import { useAppearanceStore } from '@/store/appearance.store';
import { skyAppearance } from '@/features/appearance/appearance';
import { DeepSkyBackdrop } from '@/components/system/DeepSkyBackdrop';
import {
  canRenderAttachmentUri,
  shouldMountPreviewVideo,
} from '@/features/media/media-runtime-policy';
import { useVideoPlayer } from '@/hooks/use-video-player';
import * as Haptics from 'expo-haptics';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Share2 from 'lucide-react-native/icons/share-2';
import X from 'lucide-react-native/icons/x';
import FileText from 'lucide-react-native/icons/file-text';
import Music from 'lucide-react-native/icons/music';
import Play from 'lucide-react-native/icons/play';
import Link2 from 'lucide-react-native/icons/link-2';
import Download from 'lucide-react-native/icons/download';
import Trash2 from 'lucide-react-native/icons/trash';
import MessageSquare from 'lucide-react-native/icons/message-square';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, radius, minTouchTarget } from '@/constants/responsive';
import { publishedPostUrl } from '@/lib/env';
import { isPermissionGranted } from '@/lib/permission-recovery';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { toast, ToastViewport } from '@/components/ui/Toast';
import {
  refreshSignedMediaAccess,
  shouldRefreshSignedMedia,
  type SignedMediaAccessMetadata,
  type SignedMediaAttachment,
} from '@/features/media/signed-media-access';
import { useSignedMediaAccess } from '@/features/media/use-signed-media-access';
import { SignedAttachmentImage } from '@/components/ui/SignedAttachmentImage';
import { post } from '@/api/mutations';
import { TranscriptAudioPlayer } from '@/components/audio/TranscriptAudioPlayer';

// Horizontal padding on each side — creates the "peek" effect
const SIDE_PAD = 24;
// Gap between cards
const CARD_GAP = 12;

const isExpoGo = Constants.appOwnership === 'expo';

// Lazily require the real module only when we're NOT in Expo Go — this
// prevents ExpoMediaLibraryNext's native-module lookup from ever firing
// under Expo Go, which is what was crashing on import before.
function getMediaLibrary(): typeof MediaLibraryType | null {
  if (isExpoGo) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('expo-media-library/legacy') as typeof MediaLibraryType;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreviewAttachment {
  clientId: string;
  uri: string;
  name: string;
  mimeType: string;
  duration?: number;
  isVoice?: boolean;
  thumbnailUrl?: string | null;
  persistedFileId?: string;
  sourceMessageId?: string;
  access?: SignedMediaAccessMetadata;
}

interface Props {
  visible: boolean;
  attachments: PreviewAttachment[];
  initialIndex?: number;
  onClose: () => void;
  onRemove?: (clientId: string) => void;
  /** Parent memory ID — used to construct the share link */
  memoryId?: string;
  headerMode?: 'default' | 'close-only';
  presentation?: 'standard' | 'gallery';
  onViewMessage?: (attachment: PreviewAttachment) => void;
  onDeletePersisted?: (attachment: PreviewAttachment) => void | Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolvePreviewAttachmentAccess(
  item: PreviewAttachment,
  memoryId?: string,
): Promise<PreviewAttachment> {
  const attachment: SignedMediaAttachment = {
    _id: item.persistedFileId ?? item.clientId,
    url: item.uri,
    thumbnail: item.thumbnailUrl,
    access: item.access,
  };
  if (!shouldRefreshSignedMedia(attachment)) return item;
  const refreshed = await refreshSignedMediaAccess(
    attachment,
    memoryId ? { memory_id: memoryId } : {},
    (endpoint, body) => post<SignedMediaAttachment>(endpoint, body),
  );
  return {
    ...item,
    uri: refreshed.url,
    thumbnailUrl: refreshed.thumbnail ?? item.thumbnailUrl,
    access: refreshed.access,
  };
}

// ─── Per-item renderers ───────────────────────────────────────────────────────

function ImageSlide({ uri, onClose, onError }: { uri: string; onClose: () => void; onError?: () => void }) {
  const styles = useThemedStyles(stylesBase);
  const location = sanitizeMediaUri(uri);
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
          onLoad={() => runtimeDiagnostics.record('media', 'preview-image-load', {
            outcome: 'success',
            source: location.source,
            host: location.host,
          })}
          onError={() => {
            onError?.();
            runtimeDiagnostics.record('media', 'preview-image-load', {
              outcome: 'failure',
              source: location.source,
              host: location.host,
            });
          }}
        />
    </TouchableOpacity>
  );
}

function UnavailableMediaSlide({ uri }: { uri: string }) {
  const COLORS = useThemeColors();
  const styles = useThemedStyles(stylesBase);
  useEffect(() => {
    const location = sanitizeMediaUri(uri);
    runtimeDiagnostics.record('media', 'preview-media-unavailable', {
      source: location.source,
      host: location.host,
    });
  }, [uri]);

  return (
    <View style={styles.slide}>
      <View style={[styles.roundedImage, styles.mediaCard]}>
        <View style={[styles.iconCircle, { backgroundColor: `${COLORS.brand}18` }]}>
          <FileText size={32} color={COLORS.brand} strokeWidth={1.8} />
        </View>
        <Text style={styles.mediaName}>Preview unavailable</Text>
        <Text style={styles.mediaHint}>This attachment is no longer stored on this device.</Text>
      </View>
    </View>
  );
}

function InactiveVideoSlide({ item }: { item: PreviewAttachment }) {
  const COLORS = useThemeColors();
  const styles = useThemedStyles(stylesBase);
  const canRenderThumbnail = Boolean(
    item.thumbnailUrl && canRenderAttachmentUri(item.thumbnailUrl),
  );

  return (
    <View style={styles.slide}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.mediaSurface }]}>
        {canRenderThumbnail ? (
          <ExpoImage
            source={{ uri: item.thumbnailUrl! }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
        ) : null}
        <View style={styles.videoPlayBtn}>
          <Play size={32} color={COLORS.textInverse} fill={COLORS.textInverse} strokeWidth={0} />
        </View>
      </View>
    </View>
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
  const COLORS = useThemeColors();
  const styles = useThemedStyles(stylesBase);
  // autoPlay is handled via useEffect after mount — NOT in the player initializer.
  // This modal renders VideoView inside a horizontally snapping FlatList with
  // overlays. Android's default SurfaceView can fail to paint frames there, so
  // the view below opts into TextureView and starts playback after mount.
  const { player, play, pause } = useVideoPlayer(uri, { autoPlay: false, loop: false });
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const controlsOpacity = useRef(new RNAnimated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const location = sanitizeMediaUri(uri);
    runtimeDiagnostics.record('media', 'preview-video-mount', {
      source: location.source,
      host: location.host,
    });
    return () => {
      runtimeDiagnostics.record('media', 'preview-video-unmount', {
        source: location.source,
        host: location.host,
      });
    };
  }, [uri]);

  // Start playback after <VideoView> has mounted and attached to the view hierarchy.
  // A short delay gives the modal window and native video view time to settle.
  useEffect(() => {
    if (!isActive) return;
    runtimeDiagnostics.record('media', 'preview-video-active', { active: true });
    const t = setTimeout(() => {
      play();
      runtimeDiagnostics.record('media', 'preview-video-play-request');
    }, 50);
    return () => clearTimeout(t);
  // Only run when isActive changes from false→true (slide scrolled into view)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Pause when the slide scrolls out of view
  useEffect(() => {
    if (!isActive) {
      if (player.playing) {
        pause();
      }
      setPlaying(false);
      runtimeDiagnostics.record('media', 'preview-video-active', { active: false });
    }
  }, [isActive, player, pause]);


  const progress = duration > 0 ? currentTime / duration : 0;
  const ended = progress >= 0.99;

  // Poll only the active slide to keep background media from updating React state.
  useEffect(() => {
    if (!isActive) return undefined;

    const syncPlayerState = () => {
      setCurrentTime(player.currentTime ?? 0);
      setDuration(player.duration ?? 0);
      setPlaying(player.playing ?? false);
    };

    syncPlayerState();
    const id = setInterval(() => {
      syncPlayerState();
    }, 1000);
    return () => clearInterval(id);
  }, [isActive, player]);

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
          <View pointerEvents="none" style={[styles.videoProgressFilled, { width: `${Math.round(progress * 100)}%` as any }]} />
          <View pointerEvents="none" style={[styles.videoProgressDot, { left: `${Math.round(progress * 100)}%` as any }]} />
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

/** Lets an audio slide stop the pager from swiping while its timeline is dragged. */
const PagerScrollLockContext = React.createContext<((locked: boolean) => void) | null>(null);

function AudioSlide({ item, isActive }: { item: PreviewAttachment; isActive: boolean }) {
  const styles = useThemedStyles(stylesBase);
  const setPagerLocked = React.useContext(PagerScrollLockContext);
  return (
    <View style={styles.slide}>
      <TranscriptAudioPlayer
        uri={item.uri}
        name={item.name}
        mimeType={item.mimeType}
        isVoice={item.isVoice}
        thumbnailUrl={item.thumbnailUrl}
        duration={item.duration}
        fileId={item.persistedFileId}
        isActive={isActive}
        onScrubbingChange={setPagerLocked ?? undefined}
      />
    </View>
  );
}

function DocSlide({ item }: { item: PreviewAttachment }) {
  const COLORS = useThemeColors();
  const styles = useThemedStyles(stylesBase);
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

function SignedMediaSlide({
  item,
  isActive,
  onClose,
  memoryId,
}: {
  item: PreviewAttachment;
  isActive: boolean;
  onClose: () => void;
  memoryId?: string;
}) {
  const attachment = useMemo(() => ({
    _id: item.persistedFileId ?? item.clientId,
    url: item.uri,
    thumbnail: item.thumbnailUrl,
    access: item.access,
  }), [item.access, item.clientId, item.persistedFileId, item.thumbnailUrl, item.uri]);
  const context = useMemo(
    () => memoryId ? { memory_id: memoryId } : {},
    [memoryId],
  );
  const media = useSignedMediaAccess(attachment, context);
  const normalizedItem = useMemo(() => {
    const mimeType = inferMediaMimeType({
      mimeType: item.mimeType,
      name: item.name,
      uri: media.uri,
    });
    return {
      ...item,
      uri: media.uri,
      mimeType,
      thumbnailUrl: media.attachment.thumbnail ?? item.thumbnailUrl,
      access: media.attachment.access,
    };
  }, [item, media.attachment.access, media.attachment.thumbnail, media.uri]);
  const category = normalizedItem.isVoice
    ? 'audio'
    : getMediaCategory({
      mimeType: normalizedItem.mimeType,
      name: normalizedItem.name,
      uri: normalizedItem.uri,
    });

  if (category === 'image') {
    return canRenderAttachmentUri(normalizedItem.uri)
      ? <ImageSlide uri={normalizedItem.uri} onClose={onClose} onError={media.onLoadError} />
      : <UnavailableMediaSlide uri={normalizedItem.uri} />;
  }
  if (category === 'video') {
    if (!canRenderAttachmentUri(normalizedItem.uri)) {
      return <UnavailableMediaSlide uri={normalizedItem.uri} />;
    }
    return shouldMountPreviewVideo({ category, isActive, uri: normalizedItem.uri })
      ? <MemoVideoSlide uri={normalizedItem.uri} isActive />
      : <InactiveVideoSlide item={normalizedItem} />;
  }
  if (category === 'audio') return <MemoAudioSlide item={normalizedItem} isActive={isActive} />;
  return <DocSlide item={normalizedItem} />;
}

function makeRenderSlide(onClose: () => void, currentIndex: number, memoryId?: string) {
  return function renderSlide({ item, index }: { item: PreviewAttachment; index: number }) {
    return (
      <SignedMediaSlide
        item={item}
        isActive={index === currentIndex}
        onClose={onClose}
        memoryId={memoryId}
      />
    );
  };
}

// ─── Dot indicator ────────────────────────────────────────────────────────────

function Dots({ count, active }: { count: number; active: number }) {
  const COLORS = useThemeColors();
  const styles = useThemedStyles(stylesBase);
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
              : { backgroundColor: COLORS.strokeStrong, width: 8, height: 8 },
          ]}
        />
      ))}
    </View>
  );
}

function GalleryFilmstrip({
  attachments,
  active,
  onSelect,
  memoryId,
}: {
  attachments: PreviewAttachment[];
  active: number;
  onSelect: (index: number) => void;
  memoryId?: string;
}) {
  const COLORS = useThemeColors();
  const styles = useThemedStyles(stylesBase);
  const stripRef = useRef<FlatList<PreviewAttachment>>(null);

  useEffect(() => {
    stripRef.current?.scrollToIndex({ index: active, animated: true, viewPosition: 0.5 });
  }, [active]);

  const renderThumbnail = useCallback(({ item, index }: { item: PreviewAttachment; index: number }) => {
    const category = getMediaCategory({ mimeType: item.mimeType, name: item.name, uri: item.uri });
    const ThumbnailIcon = category === 'audio' ? Music : FileText;
    return (
    <TouchableOpacity
      accessibilityLabel={`View ${item.name}`}
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={() => { Haptics.selectionAsync(); onSelect(index); }}
      style={[styles.galleryThumbnail, index === active && styles.galleryThumbnailActive]}
    >
      {category === 'image' || category === 'video' ? (
        <SignedAttachmentImage
          attachment={{
            _id: item.persistedFileId ?? item.clientId,
            url: item.uri,
            thumbnail: item.thumbnailUrl,
            access: item.access,
          }}
          context={memoryId ? { memory_id: memoryId } : undefined}
          preferThumbnail
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={styles.galleryThumbnailFallback}><ThumbnailIcon size={20} color={COLORS.textBase} /></View>
      )}
      {category === 'video' ? (
        <View style={styles.galleryThumbnailPlay}><Play size={13} color={COLORS.textInverse} fill={COLORS.textInverse} /></View>
      ) : null}
    </TouchableOpacity>
    );
  }, [active, memoryId, onSelect]);

  return (
    <FlatList
      ref={stripRef}
      style={styles.galleryFilmstripList}
      horizontal
      data={attachments}
      keyExtractor={(item) => item.clientId}
      renderItem={renderThumbnail}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.galleryFilmstrip}
      ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
      getItemLayout={(_, index) => ({ length: 62, offset: 62 * index, index })}
      onScrollToIndexFailed={() => {}}
    />
  );
}

// ─── Modal inner — reads insets from the scoped SafeAreaProvider ──────────────

function ModalInner({ attachments, initialIndex, onClose, onRemove, memoryId, headerMode = 'default', presentation = 'standard', onViewMessage, onDeletePersisted }: Omit<Props, 'visible' | 'initialIndex'> & { initialIndex: number }) {
  const COLORS = useThemeColors();
  const styles = useThemedStyles(stylesBase);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Audio slides lock paging while their timeline is being scrubbed.
  const [pagerLocked, setPagerLocked] = useState(false);

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
  const [deleteCandidate, setDeleteCandidate] = useState<PreviewAttachment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const currentItem = attachments[currentIndex];
  const sky = useAppearanceStore((state) => skyAppearance(state.preference));
  const currentItemIsAudio = !!currentItem && (
    currentItem.isVoice || getMediaCategory({ mimeType: currentItem.mimeType, name: currentItem.name, uri: currentItem.uri }) === 'audio'
  );
  const currentItemIsVisual = !!currentItem && (
    currentItem.mimeType.startsWith('image/') || currentItem.mimeType.startsWith('video/')
  );
  const saveActionTitle = currentItemIsVisual
    ? Platform.OS === 'ios' ? 'Save to Photos' : 'Save to Gallery'
    : Platform.OS === 'ios' ? 'Save to Files' : 'Download file';
  const saveActionDescription = currentItemIsVisual
    ? Platform.OS === 'ios' ? 'Save this to your photo library' : 'Save this to your gallery'
    : Platform.OS === 'ios' ? 'Open the share sheet to save a copy to Files' : 'Export a copy using apps on your device';
  const saveSuccessMessage = currentItemIsVisual
    ? Platform.OS === 'ios' ? 'Saved to Photos' : 'Saved to Gallery'
    : Platform.OS === 'ios' ? 'Saved to Files' : 'File downloaded';


  const handleShareButtonPress = useCallback(() => {
    Haptics.selectionAsync();
    setShareMenuVisible(true);
  }, []);

  const handleShareLink = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareMenuVisible(false);
    if (memoryId) {
      const url = publishedPostUrl(memoryId);
      try {
        await Clipboard.setStringAsync(url);
        // Also open native share with the link
        await Share.share({ url, message: url });
      } catch {
        toast('We couldn’t share this link. Please try again.', 'error');
      }
    }
  }, [memoryId]);

  const handleSaveToGallery = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareMenuVisible(false);
    const current = attachments[currentIndex];
    if (!current) return;

    try {
      const item = await resolvePreviewAttachmentAccess(current, memoryId);
      const MediaLibrary = getMediaLibrary();
      if (!MediaLibrary) {
        let localUri = item.uri;
        if (item.uri.startsWith('http')) {
          const filename = item.name || `memento_${Date.now()}`;
          const result = await FileSystem.downloadAsync(item.uri, `${FileSystem.cacheDirectory}${filename}`);
          localUri = result.uri;
        }
        await Share.share({ url: localUri, message: item.name });
        toast('Use the share menu to save this file.', 'info');
        return;
      }

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!isPermissionGranted(permission)) {
        showPermissionRecoveryAlert({
          permission,
          title: 'Gallery access is tucked away',
          description: 'Allow gallery access to save this memory to your library.',
          settingsDescription: 'Gallery access is turned off in Settings. Turn it back on to save this memory to your library.',
        });
        return;
      }

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
      toast(saveSuccessMessage, 'success');
    } catch {
      toast('Could not save media. Please try again in a moment.', 'error');
    }
  }, [attachments, currentIndex, memoryId, saveSuccessMessage]);

  const handleShareFile = useCallback(async () => {
    Haptics.selectionAsync();
    setShareMenuVisible(false);
    const current = attachments[currentIndex];
    if (!current) return;
    try {
      const item = await resolvePreviewAttachmentAccess(current, memoryId);
      let localUri = item.uri;
      if (item.uri.startsWith('http')) {
        const filename = item.name || `memento_${Date.now()}`;
        const downloadDest = `${FileSystem.cacheDirectory}${filename}`;
        const { uri } = await FileSystem.downloadAsync(item.uri, downloadDest);
        localUri = uri;
      }

      await Share.share({ url: localUri, message: item.name });
      if (!currentItemIsVisual) {
        toast(saveSuccessMessage, 'success');
      }
    } catch {
      toast('We couldn’t share this file. Please try again.', 'error');
    }
  }, [attachments, currentIndex, currentItemIsVisual, memoryId, saveSuccessMessage]);

  const handleSaveOrExport = useCallback(async () => {
    if (currentItemIsVisual) {
      await handleSaveToGallery();
      return;
    }

    await handleShareFile();
  }, [currentItemIsVisual, handleSaveToGallery, handleShareFile]);

  const isGallery = presentation === 'gallery';
  const SCREEN_W = windowWidth;
  const CARD_W = SCREEN_W - SIDE_PAD * 2;
  const pageWidth = isGallery ? SCREEN_W : CARD_W;
  const pageGap = isGallery ? 0 : CARD_GAP;

  const renderSlide = useCallback(
    makeRenderSlide(onClose, currentIndex, memoryId),
    [onClose, currentIndex, memoryId],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: PreviewAttachment; index: number }) => (
      <View style={{ flex: 1, width: pageWidth }}>{renderSlide({ item, index })}</View>
    ),
    [pageWidth, renderSlide],
  );

  const selectGalleryItem = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
    setCurrentIndex(index);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteCandidate || !onDeletePersisted || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeletePersisted(deleteCandidate);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDeleteCandidate(null);
      onClose();
    } catch {
      toast('Could not delete this attachment. Please try again.', 'error');
      setIsDeleting(false);
    }
  }, [deleteCandidate, isDeleting, onClose, onDeletePersisted]);

  return (
    <View style={[styles.container, { backgroundColor: currentItemIsAudio ? COLORS.canvas : COLORS.mediaViewer, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Audio plays on the app's own page background (the sky in sky themes); photos keep the viewer backdrop. */}
      {currentItemIsAudio && sky && <DeepSkyBackdrop sky={sky} />}
      {/* ── Header ── */}
      <View style={styles.header}>
        {isGallery ? (
          <>
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); onClose(); }}
              style={[styles.galleryHeaderButton, { backgroundColor: COLORS.cardRaised }]}
              activeOpacity={0.8}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              accessibilityLabel="Back"
            >
              <ChevronLeft size={iconSize(22)} color={COLORS.textStrong} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.galleryHeaderActions}>
              <TouchableOpacity
                disabled={!currentItem?.persistedFileId || !onDeletePersisted}
                onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); if (currentItem) setDeleteCandidate(currentItem); }}
                style={[styles.galleryHeaderButton, { backgroundColor: COLORS.cardRaised }]}
                activeOpacity={0.8}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityLabel="Delete attachment"
              >
                <Trash2 size={iconSize(20)} color={COLORS.textStrong} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleSaveOrExport()}
                style={[styles.galleryHeaderButton, { backgroundColor: COLORS.cardRaised }]}
                activeOpacity={0.8}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityLabel="Save or export"
              >
                <Download size={iconSize(21)} color={COLORS.textStrong} />
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!currentItem?.sourceMessageId || !onViewMessage}
                onPress={() => currentItem && onViewMessage?.(currentItem)}
                style={[styles.galleryViewMessage, { backgroundColor: COLORS.cardRaised }]}
                activeOpacity={0.8}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityLabel="View message"
              >
                <MessageSquare size={iconSize(19)} color={COLORS.textStrong} />
                <Text style={styles.galleryViewMessageText}>View message</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : headerMode === 'close-only' ? (
          <>
            <View style={styles.headerSpacer} />
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); onClose(); }}
              style={[styles.iconBtn, { backgroundColor: COLORS.cardRaised }]}
              activeOpacity={0.8}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Close"
            >
              <X size={iconSize(20)} color={COLORS.textBase} strokeWidth={2} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); onClose(); }}
              style={[styles.iconBtn, { backgroundColor: COLORS.cardRaised }]}
              activeOpacity={0.8}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Back"
            >
              <ChevronLeft size={iconSize(20)} color={COLORS.textBase} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShareButtonPress}
              style={[styles.sharePill, { backgroundColor: COLORS.cardRaised }]}
              activeOpacity={0.8}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Share"
            >
              <Share2 size={iconSize(14)} color={COLORS.textBase} strokeWidth={2} />
              <Text style={styles.shareLabel}>Share</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => { Haptics.selectionAsync(); onClose(); }}
          activeOpacity={1}
        />
        <PagerScrollLockContext.Provider value={setPagerLocked}>
        <FlatList
          ref={listRef}
          data={attachments}
          keyExtractor={(item) => item.clientId}
          horizontal
          pagingEnabled={false}
          snapToInterval={pageWidth + pageGap}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: isGallery ? 0 : SIDE_PAD }}
          ItemSeparatorComponent={() => <View style={{ width: pageGap }} />}
          onViewableItemsChanged={handleViewableChange}
          viewabilityConfig={viewabilityConfig.current}
          getItemLayout={(_, index) => ({ length: pageWidth + pageGap, offset: (pageWidth + pageGap) * index, index })}
          renderItem={renderItem}
          extraData={currentIndex}
          initialScrollIndex={initialIndex}
          onScrollToIndexFailed={() => {}}
          scrollEnabled={!pagerLocked}
          style={{ flex: 1 }}
        />
        </PagerScrollLockContext.Provider>
      </View>

      {isGallery ? (
        <GalleryFilmstrip attachments={attachments} active={currentIndex} onSelect={selectGalleryItem} memoryId={memoryId} />
      ) : (
        <Dots count={attachments.length} active={currentIndex} />
      )}



      {deleteCandidate ? (
        <View style={styles.galleryConfirmationOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !isDeleting && setDeleteCandidate(null)} />
          <View style={styles.galleryConfirmationCard}>
            <View style={styles.galleryConfirmationIcon}><Trash2 size={24} color={COLORS.error} /></View>
            <Text style={styles.galleryConfirmationTitle}>Delete this attachment?</Text>
            <Text style={styles.galleryConfirmationCopy}>This removes it from the conversation and cannot be undone.</Text>
            <View style={styles.galleryConfirmationActions}>
              <TouchableOpacity disabled={isDeleting} onPress={() => setDeleteCandidate(null)} style={styles.galleryConfirmationCancel}>
                <Text style={styles.galleryConfirmationCancelText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isDeleting} onPress={() => void handleConfirmDelete()} style={styles.galleryConfirmationDelete}>
                {isDeleting ? <ActivityIndicator color={COLORS.textInverse} /> : <Text style={styles.galleryConfirmationDeleteText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {/* ── Custom share action panel ── */}
      <Modal
        visible={shareMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareMenuVisible(false)}
      >
        <SafeAreaProvider>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={() => { Haptics.selectionAsync(); setShareMenuVisible(false); }}
        />
        <SafeAreaView edges={['bottom']} style={styles.shareMenuSafeArea}>
        <View style={{
          backgroundColor: COLORS.background,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingTop: 12,
          paddingBottom: 24,
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
                <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>Share memory link</Text>
                <Text style={{ ...TYPE.metadata, color: COLORS.textWeak, marginTop: 1 }}>Copy and share the public link</Text>
              </View>
            </TouchableOpacity>
          )}

          {Platform.OS === 'ios' ? (
            <>
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
                  <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>Share file</Text>
                  <Text style={{ ...TYPE.metadata, color: COLORS.textWeak, marginTop: 1 }}>Send via message, email or another app</Text>
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: COLORS.strokeWeaker, marginHorizontal: 4, marginVertical: 4 }} />

              {/* Save / export */}
              <TouchableOpacity
                onPress={handleSaveOrExport}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 4 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
                  <Download size={20} color={COLORS.textBase} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>{saveActionTitle}</Text>
                  <Text style={{ ...TYPE.metadata, color: COLORS.textWeak, marginTop: 1 }}>{saveActionDescription}</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Save / export */}
              <TouchableOpacity
                onPress={handleSaveOrExport}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 4 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
                  <Download size={20} color={COLORS.textBase} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>{saveActionTitle}</Text>
                  <Text style={{ ...TYPE.metadata, color: COLORS.textWeak, marginTop: 1 }}>{saveActionDescription}</Text>
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
                  <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>Share file</Text>
                  <Text style={{ ...TYPE.metadata, color: COLORS.textWeak, marginTop: 1 }}>Send via message, email or another app</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
        </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MediaPreviewModal({ visible, attachments, initialIndex = 0, onClose, onRemove, memoryId, headerMode = 'default', presentation = 'standard', onViewMessage, onDeletePersisted }: Props) {
  const COLORS = useThemeColors();
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
          headerMode={headerMode}
          presentation={presentation}
          onViewMessage={onViewMessage}
          onDeletePersisted={onDeletePersisted}
        />
        <ToastViewport />
      </SafeAreaProvider>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const stylesBase = StyleSheet.create({
  shareMenuSafeArea: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
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
    width: 36, height: 36, borderRadius: radius(18),
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
    alignItems: 'center', justifyContent: 'center',
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  sharePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 36, paddingHorizontal: 16, borderRadius: radius(18),
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1, borderColor: COLORS.strokeWeaker,
  },
  shareLabel: {
    ...TYPE.label, color: COLORS.textBase,
  },
  galleryHeaderActions: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  galleryHeaderButton: {
    width: 40, height: 40, borderRadius: radius(20),
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center', justifyContent: 'center',
  },
  galleryViewMessage: {
    height: 40, borderRadius: radius(20), paddingHorizontal: 14,
    backgroundColor: COLORS.fillWeak,
    flexDirection: 'row', alignItems: 'center', gap: 7,
  },
  galleryViewMessageText: {
    color: COLORS.textStrong, ...TYPE.label,
  },

  // Slides
  slide: {
    width: '100%',
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
    ...TYPE.body,
    color: COLORS.textStrong, textAlign: 'center',
  },
  mediaHint: {
    ...TYPE.bodySmall,
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
    ...TYPE.metadata,
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
    ...TYPE.metadata,
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
  galleryFilmstrip: {
    paddingHorizontal: 4,
    paddingBottom: 4,
    paddingTop: 8,
  },
  galleryFilmstripList: {
    flexGrow: 0,
    height: 68,
  },
  galleryThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: COLORS.fillWeak,
  },
  galleryThumbnailActive: {
    borderColor: COLORS.brand,
  },
  galleryThumbnailFallback: {
    alignItems: 'center',
    backgroundColor: COLORS.fillWeak,
    flex: 1,
    justifyContent: 'center',
  },
  galleryThumbnailPlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,11,0,0.18)',
  },
  galleryConfirmationOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'rgba(23,11,0,0.35)',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  galleryConfirmationCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    gap: 10,
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  galleryConfirmationIcon: {
    alignItems: 'center',
    backgroundColor: `${COLORS.error}12`,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginBottom: 4,
    width: 48,
  },
  galleryConfirmationTitle: {
    color: COLORS.textStrong,
    ...TYPE.sectionTitle,
    textAlign: 'center',
  },
  galleryConfirmationCopy: {
    color: COLORS.textBase,
    ...TYPE.label,
    lineHeight: 20,
    textAlign: 'center',
  },
  galleryConfirmationActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    width: '100%',
  },
  galleryConfirmationCancel: {
    alignItems: 'center',
    backgroundColor: COLORS.fillWeak,
    borderRadius: 999,
    flex: 1,
    height: 54,
    justifyContent: 'center',
  },
  galleryConfirmationCancelText: {
    color: COLORS.textStrong,
    ...TYPE.body,
  },
  galleryConfirmationDelete: {
    alignItems: 'center',
    backgroundColor: COLORS.error,
    borderRadius: 999,
    flex: 1,
    height: 54,
    justifyContent: 'center',
  },
  galleryConfirmationDeleteText: {
    color: COLORS.textInverse,
    ...TYPE.body,
  },
});
