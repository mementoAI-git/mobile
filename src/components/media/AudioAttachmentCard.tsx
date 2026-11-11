import React, { useCallback } from 'react';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { TYPE } from '@/constants/typography';
import { radius } from '@/constants/responsive';

export interface AudioAttachmentItem {
  _id?: string;
  name?: string;
  type?: string;
  thumbnail?: string | null;
  duration?: number;
}

/**
 * How an audio attachment looks: album art with a wave strip, a voice recording as a dark
 * square with orange waves, or other audio on a light square. Used on the story page and
 * in the story editor.
 */
export const AudioAttachmentCard = React.memo(function AudioAttachmentCard({
  item,
  memoryTitle,
  onPress,
  width,
}: {
  item: AudioAttachmentItem;
  memoryTitle?: string;
  onPress?: (item: any) => void;
  /** Square card width; defaults to half the content width, as on the story page. */
  width?: number;
}) {
  const COLORS = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = width ?? (Math.min(windowWidth, 720) - 40) / 2;
  const handlePress = useCallback(() => onPress?.(item), [item, onPress]);
  const isVoice = item.name?.startsWith('voice_') && item.type === 'audio/m4a';
  const albumArt = item.thumbnail;
  const dur = Number(item.duration ?? 0);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const rawFileName = item.name
    ? item.name.replace(/\.[^.]+$/, '').replace(/_\d{12,}$/, '').replace(/_/g, ' ')
    : 'Audio';
  const fileName = memoryTitle && memoryTitle !== 'Untitled Memory' ? memoryTitle : rawFileName;

  if (albumArt) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.88}
        style={{ borderRadius: 16, overflow: 'hidden', height: 120 }}
      >
        <Image source={{ uri: albumArt }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.mediaScrim }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 14 }}>
            {[5, 10, 14, 11, 7, 12, 8, 14].map((h, i) => <View key={i} style={{ width: 2.5, height: h, backgroundColor: COLORS.brand, borderRadius: 2 }} />)}
          </View>
          <Text style={{ ...TYPE.metadata, color: COLORS.mediaText, flex: 1 }} numberOfLines={1}>{fileName}</Text>
          {dur > 0 && <Text style={{ ...TYPE.metadata, color: COLORS.mediaTextWeak }}>{fmt(dur)}</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  if (isVoice) {
    let h = 0;
    const seed = item._id || item.name || '';
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    const bars = Array.from({ length: 16 }, (_, i) =>
      4 + Math.round((Math.sin((Math.abs(h) + i * 997) * 0.013) * 0.5 + 0.5) * 20)
    );
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.88}
        style={{ backgroundColor: COLORS.mediaSurface, borderRadius: radius(20), aspectRatio: 1, width: cardWidth, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 32 }}>
          {bars.map((barH, i) => (
            <View key={i} style={{ flex: 1, height: barH, borderRadius: 2, backgroundColor: `${COLORS.brand}cc`, maxHeight: 28 }} />
          ))}
        </View>
        <Text style={{ ...TYPE.metadata, color: COLORS.mediaText, textAlign: 'center' }} numberOfLines={2}>
          {fileName}
        </Text>
        {dur > 0 && (
          <View style={{ backgroundColor: COLORS.mediaFill, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ ...TYPE.metadata, color: COLORS.mediaTextWeak }}>{fmt(dur)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.88}
      style={{ backgroundColor: COLORS.fillWeak, borderRadius: radius(20), aspectRatio: 1, width: cardWidth, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 32 }}>
        {[8, 16, 24, 20, 12, 22, 14, 24, 18, 8, 16, 24].map((h, i) => (
          <View key={i} style={{ width: 3, height: h, backgroundColor: COLORS.brand, borderRadius: 2 }} />
        ))}
      </View>
      <Text style={{ ...TYPE.metadata, color: COLORS.textStrong, textAlign: 'center' }} numberOfLines={2}>{fileName}</Text>
      {dur > 0 && (
        <View style={{ backgroundColor: COLORS.cardOverlay, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ ...TYPE.metadata, color: COLORS.textBase }}>{fmt(dur)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});
