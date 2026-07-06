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

import React, { useEffect, useState, useCallback } from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import * as Haptics from 'expo-haptics';
import { Play } from 'lucide-react-native';
import { COLORS } from '@/constants/tokens';

// ─── LRU cache (max 100 entries) ─────────────────────────────────────────────

const CACHE_MAX = 100;
const thumbnailCache = new Map<string, string>();

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

export function VideoThumbnail({ uri, thumbnailUrl, width, height, borderRadius = 14, onPress }: VideoThumbnailProps) {
  const fillParent = !width || !height;

  // If the server already provides a thumbnail URL, use it directly.
  // Otherwise fall back to client-side extraction via expo-video-thumbnails.
  const hasServerThumb = Boolean(thumbnailUrl);

  const [thumbUri, setThumbUri] = useState<string | null>(() => {
    if (thumbnailUrl) return thumbnailUrl;
    return thumbnailCache.get(uri) ?? null;
  });
  const [loading, setLoading] = useState(!hasServerThumb && !thumbnailCache.has(uri));

  useEffect(() => {
    // Skip extraction if server already gave us a thumbnail
    if (hasServerThumb || !uri || thumbnailCache.has(uri)) return;
    let cancelled = false;

    getThumbnailAsync(uri, { time: 0, quality: 0.4 })
      .then(({ uri: t }: { uri: string }) => {
        if (cancelled) return;
        cachePut(uri, t);
        setThumbUri(t);
      })
      .catch(() => {
        // Extraction failed (e.g. network video not yet reachable) — show dark placeholder
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [uri, hasServerThumb]);

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
          <Play size={22} color="#fff" fill="#fff" strokeWidth={0} style={{ marginLeft: 3 }} />
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
