/**
 * VideoThumbnail — extracts the first frame of a video URI and renders it as a
 * thumbnail with a centred ▶ play button overlay.
 *
 * Performance:
 *  - timeMs=0: reads the first keyframe — no seek, fastest possible extraction
 *  - quality=0.4: small JPEG (~5–15 KB)
 *  - LRU Map (max 100 entries): each URL is extracted at most once per app session;
 *    the cache is bounded and evicts the oldest entry when full
 *
 * Usage:
 *   <VideoThumbnail
 *     uri="https://..."
 *     width={SCREEN_W - 40}
 *     height={(SCREEN_W - 40) * (9 / 16)}
 *     onPress={handleOpenPreview}
 *   />
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import * as Haptics from 'expo-haptics';
import { Play } from 'lucide-react-native';
import { COLORS } from '@/constants/tokens';
import { iconSize, radius } from '@/constants/responsive';
import { runtimeDiagnostics, sanitizeMediaUri } from '@/lib/runtime-diagnostics';
import { getVideoThumbnailStrategy } from '@/features/media/media-runtime-policy';
import {
  type SignedMediaAttachment,
  type SignedMediaContext,
} from '@/features/media/signed-media-access';
import { useSignedMediaAccess } from '@/features/media/use-signed-media-access';

// ─── LRU cache (bounded to avoid retaining large generated thumbnails) ─────

const CACHE_MAX = 32;
const thumbnailCache = new Map<string, string>();

export function clearVideoThumbnailCache() {
  thumbnailCache.clear();
}

function cachePut(uri: string, thumbnailUri: string) {
  if (thumbnailCache.size >= CACHE_MAX) {
    // Delete the oldest entry (Map preserves insertion order)
    const oldest = thumbnailCache.keys().next().value;
    if (oldest !== undefined) thumbnailCache.delete(oldest);
  }
  thumbnailCache.set(uri, thumbnailUri);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface VideoThumbnailProps {
  uri: string;
  attachment?: SignedMediaAttachment;
  context?: SignedMediaContext;
  /**
   * Server-provided thumbnail URL (e.g. from Cloudinary fetch transformation).
   * When provided, skips `expo-video-thumbnails` extraction entirely — instant load.
   */
  thumbnailUrl?: string | null;
  /**
   * Explicit pixel width. When omitted (or 0) the component fills its parent via
   * StyleSheet.absoluteFill — useful inside aspectRatio containers.
   */
  width?: number;
  height?: number;
  borderRadius?: number;
  onPress?: () => void;
}

export function VideoThumbnail({
  uri,
  attachment,
  context,
  thumbnailUrl,
  width,
  height,
  borderRadius = radius(14),
  onPress,
}: VideoThumbnailProps) {
  const fillParent = !width || !height;
  const mediaAttachment = useMemo<SignedMediaAttachment>(
    () => attachment ?? { _id: uri, url: uri },
    [attachment, uri],
  );
  const signedMedia = useSignedMediaAccess(mediaAttachment, context);
  const effectiveUri = signedMedia.uri;
  const effectiveThumbnail = typeof signedMedia.attachment.thumbnail === 'string'
    ? signedMedia.attachment.thumbnail
    : thumbnailUrl;

  // If the server already provides a thumbnail URL, use it directly.
  // Otherwise fall back to client-side extraction via expo-video-thumbnails.
  const hasServerThumb = Boolean(effectiveThumbnail);
  const strategy = getVideoThumbnailStrategy({
    uri: effectiveUri,
    thumbnailUrl: effectiveThumbnail,
    hasCachedThumbnail: thumbnailCache.has(effectiveUri),
  });

  const [thumbUri, setThumbUri] = useState<string | null>(() => {
    if (effectiveThumbnail) return effectiveThumbnail;
    return thumbnailCache.get(effectiveUri) ?? null;
  });
  const [loading, setLoading] = useState(strategy === 'extract');

  useEffect(() => {
    const location = sanitizeMediaUri(effectiveUri);
    if (strategy === 'server' && effectiveThumbnail) {
      runtimeDiagnostics.record('media', 'thumbnail-source', {
        source: 'server',
        mediaSource: location.source,
        host: location.host,
      });
      setThumbUri(effectiveThumbnail);
      setLoading(false);
      return;
    }

    const cached = thumbnailCache.get(effectiveUri);
    if (strategy === 'cache' && cached) {
      runtimeDiagnostics.record('media', 'thumbnail-source', {
        source: 'memory-cache',
        mediaSource: location.source,
        host: location.host,
      });
      setThumbUri(cached);
      setLoading(false);
      return;
    }

    if (strategy === 'placeholder') {
      runtimeDiagnostics.record('media', 'thumbnail-source', {
        source: 'placeholder',
        mediaSource: location.source,
        host: location.host,
      });
      setThumbUri(null);
      setLoading(false);
      return;
    }

    // Skip extraction if server already gave us a thumbnail
    if (!effectiveUri) {
      setThumbUri(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const finishExtraction = runtimeDiagnostics.start('media', 'thumbnail-extraction', {
      mediaSource: location.source,
      host: location.host,
    });
    setThumbUri(null);
    setLoading(true);

    getThumbnailAsync(effectiveUri, { time: 0, quality: 0.4 })
      .then(({ uri: t }: { uri: string }) => {
        if (cancelled) return;
        cachePut(effectiveUri, t);
        setThumbUri(t);
        finishExtraction({ outcome: 'success' });
      })
      .catch((error: unknown) => {
        // Extraction failed (e.g. network video not yet reachable) — show dark placeholder
        if (!cancelled) {
          finishExtraction({
            outcome: 'failure',
            errorClass: error instanceof Error ? error.name : 'UnknownError',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [strategy, effectiveUri, effectiveThumbnail]);

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress?.();
  }, [onPress]);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={[
        styles.container,
        fillParent ? StyleSheet.absoluteFill : { width, height },
        { borderRadius },
      ]}
    >
      {thumbUri ? (
        <Image
          source={{ uri: thumbUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoad={() => runtimeDiagnostics.record('media', 'thumbnail-image-load', {
            outcome: 'success',
            source: hasServerThumb ? 'server' : 'generated',
          })}
          onError={() => {
            signedMedia.onLoadError();
            runtimeDiagnostics.record('media', 'thumbnail-image-load', {
              outcome: 'failure',
              source: hasServerThumb ? 'server' : 'generated',
            });
          }}
        />
      ) : (
        // Dark placeholder while loading or on error
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
      )}

      {/* Translucent dark overlay */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />

      {/* Centred play button */}
      <View style={styles.playBtn}>
        {loading ? (
          <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
        ) : (
          <Play size={iconSize(22)} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 3 }} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: COLORS.textStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: '#1a1a1a',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
