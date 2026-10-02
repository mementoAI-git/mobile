import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Image,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import ExternalLink from 'lucide-react-native/icons/external-link';
import X from 'lucide-react-native/icons/x';
import Globe from 'lucide-react-native/icons/globe';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, radius } from '@/constants/responsive';
import { useLinkPreview, type LinkPreviewData } from '@/hooks/use-link-preview';

// ─── Favicon Badge ────────────────────────────────────────────────────────────

function FaviconBadge({ url, hostname }: { url: string; hostname: string }) {
  const [failed, setFailed] = useState(false);
  const letter = (hostname.charAt(0) || 'L').toUpperCase();

  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return (
      <View style={styles.faviconFallback}>
        <Text style={styles.faviconFallbackText}>{letter}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={styles.faviconImage}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname;
    if (path.length > 24) {
      return `${host}${path.slice(0, 20)}…`;
    }
    return `${host}${path}`;
  } catch {
    return url.length > 35 ? `${url.slice(0, 32)}…` : url;
  }
}

// ─── Link Preview Card ────────────────────────────────────────────────────────

export interface LinkPreviewCardProps {
  preview: LinkPreviewData;
  onRemove?: (url: string) => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'card' | 'chip';
}

export function LinkPreviewCard({
  preview,
  onRemove,
  style,
  variant = 'card',
}: LinkPreviewCardProps) {
  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    Linking.openURL(preview.url).catch(() => {});
  }, [preview.url]);

  const handleRemove = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onRemove) onRemove(preview.url);
  }, [onRemove, preview.url]);

  const hasImage = Boolean(preview.imageUrl);
  const title = preview.title || shortenUrl(preview.url);

  if (variant === 'chip') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[styles.chipContainer, style]}
      >
        <FaviconBadge url={preview.faviconUrl} hostname={preview.hostname} />
        <Text style={styles.chipText} numberOfLines={1}>
          {title}
        </Text>
        <ExternalLink size={iconSize(12)} color={COLORS.textWeak} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.cardOuter, style]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={styles.cardTouchable}
      >
        {hasImage && (
          <ExpoImage
            source={{ uri: preview.imageUrl! }}
            style={styles.cardThumbnail}
            contentFit="cover"
            transition={200}
          />
        )}
        <View style={styles.cardContent}>
          {/* Host header */}
          <View style={styles.cardHostRow}>
            <FaviconBadge url={preview.faviconUrl} hostname={preview.hostname} />
            <Text style={styles.cardHostText} numberOfLines={1}>
              {preview.hostname}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>

          {/* Description */}
          {Boolean(preview.description) && (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {preview.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Remove button (when editable) */}
      {Boolean(onRemove) && (
        <TouchableOpacity
          onPress={handleRemove}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.removeBtn}
        >
          <X size={iconSize(12)} color={COLORS.textWeak} strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Link Previews List (Hook Wrapper) ───────────────────────────────────────

export interface LinkPreviewsProps {
  text?: string;
  previews?: LinkPreviewData[];
  onRemove?: (url: string) => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'card' | 'chip';
}

export function LinkPreviews({
  text = '',
  previews: propPreviews,
  onRemove,
  style,
  variant = 'card',
}: LinkPreviewsProps) {
  const hookPreviews = useLinkPreview(propPreviews ? '' : text);
  const activePreviews = propPreviews ?? hookPreviews;

  if (!activePreviews || activePreviews.length === 0) return null;

  return (
    <View style={[styles.listContainer, style]}>
      {activePreviews.map((preview) => (
        <LinkPreviewCard
          key={preview.url}
          preview={preview}
          onRemove={onRemove}
          variant={variant}
        />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContainer: {
    gap: 8,
    marginVertical: 6,
  },
  cardOuter: {
    borderRadius: radius(16),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
  },
  cardThumbnail: {
    width: 68,
    height: 68,
    borderRadius: radius(12),
    backgroundColor: COLORS.fillWeak,
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  cardHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardHostText: {
    ...TYPE.eyebrow,
    color: COLORS.textWeak,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardTitle: {
    ...TYPE.bodySmall,
    lineHeight: 18,
    color: COLORS.textStrong,
  },
  cardDescription: {
    ...TYPE.metadata,
    lineHeight: 15,
    color: COLORS.textWeak,
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: minTouchTarget(44),
    borderRadius: radius(12),
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
  },
  chipText: {
    ...TYPE.metadata,
    color: COLORS.textStrong,
    flex: 1,
  },
  faviconFallback: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  faviconFallbackText: {
    ...TYPE.eyebrow,
    color: COLORS.textWeak,
  },
  faviconImage: {
    width: 18,
    height: 18,
    borderRadius: 4,
    flexShrink: 0,
    backgroundColor: 'transparent',
  },
});
