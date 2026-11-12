import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View, type LayoutChangeEvent } from 'react-native';
import Play from 'lucide-react-native/icons/play';
import X from 'lucide-react-native/icons/x';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { TYPE } from '@/constants/typography';
import { radius } from '@/constants/responsive';
import { recordingWaveform } from '@/features/media/recording-waveform';

export interface AudioAttachmentItem {
  _id?: string;
  name?: string;
  type?: string;
  thumbnail?: string | null;
  duration?: number;
}

const BAR_WIDTH = 2.5;
const BAR_GAP = 2.5;
const WAVE_HEIGHT = 30;
const MIN_BAR = 3;
const PLAY_SIZE = 36;

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function recordingTitle(item: AudioAttachmentItem, memoryTitle?: string) {
  if (memoryTitle && memoryTitle !== 'Untitled Memory') return memoryTitle;
  return item.name
    ? item.name.replace(/\.[^.]+$/, '').replace(/_\d{12,}$/, '').replace(/_/g, ' ')
    : 'Audio';
}

/**
 * How a recording (or any audio attachment) looks everywhere in the app: its
 * title, a play button, a waveform and the length, on the weak fill. Tapping it
 * opens the audio player. `compact` drops the title line for tight spots (the
 * chat composer, the Overview capture card).
 */
export const AudioAttachmentCard = React.memo(function AudioAttachmentCard({
  item,
  memoryTitle,
  onPress,
  onRemove,
  uploading = false,
  compact = false,
}: {
  item: AudioAttachmentItem;
  memoryTitle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- callers pass their own richer attachment type
  onPress?: (item: any) => void;
  /** Shows a remove control (editors and composers). */
  onRemove?: () => void;
  /** Covers the card with a spinner while the file uploads. */
  uploading?: boolean;
  compact?: boolean;
}) {
  const COLORS = useThemeColors();
  const handlePress = useCallback(() => onPress?.(item), [item, onPress]);
  const title = recordingTitle(item, memoryTitle);
  const seconds = Number(item.duration ?? 0);
  const duration = seconds > 0 ? formatDuration(seconds) : '';
  const [waveWidth, setWaveWidth] = useState(0);
  const onWaveLayout = useCallback((event: LayoutChangeEvent) => {
    setWaveWidth(Math.round(event.nativeEvent.layout.width));
  }, []);
  // As many bars as fit, so the waveform fills the space at any card width.
  const barCount = Math.max(0, Math.floor((waveWidth + BAR_GAP) / (BAR_WIDTH + BAR_GAP)));
  const bars = useMemo(
    () => recordingWaveform(item._id || item.name || title, barCount),
    [item._id, item.name, title, barCount],
  );

  const removeButton = onRemove ? (
    <TouchableOpacity
      onPress={onRemove}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Remove recording"
      style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}
    >
      <X size={12} color={COLORS.textBase} strokeWidth={2.5} />
    </TouchableOpacity>
  ) : null;

  return (
    <View>
      <TouchableOpacity
        onPress={handlePress}
        disabled={!onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Play ${title}${duration ? `, ${duration}` : ''}`}
        style={{ backgroundColor: COLORS.fillWeak, borderRadius: radius(compact ? 16 : 20), padding: compact ? 10 : 16, gap: 12 }}
      >
        {compact ? null : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 24 }}>
            <Text style={{ ...TYPE.label, color: COLORS.textStrong, flex: 1 }} numberOfLines={1}>{title}</Text>
            {removeButton}
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: PLAY_SIZE, height: PLAY_SIZE, borderRadius: PLAY_SIZE / 2, backgroundColor: COLORS.activeFill, alignItems: 'center', justifyContent: 'center' }}>
            <Play size={14} color={COLORS.activeText} fill={COLORS.activeText} style={{ marginLeft: 2 }} />
          </View>
          <View
            onLayout={onWaveLayout}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ flex: 1, height: WAVE_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: BAR_GAP, overflow: 'hidden' }}
          >
            {bars.map((bar, i) => (
              <View
                key={i}
                style={{ width: BAR_WIDTH, height: MIN_BAR + bar * (WAVE_HEIGHT - MIN_BAR), borderRadius: BAR_WIDTH / 2, backgroundColor: COLORS.brand }}
              />
            ))}
          </View>
          {duration ? (
            <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, fontVariant: ['tabular-nums'] }}>{duration}</Text>
          ) : null}
          {compact ? removeButton : null}
        </View>
      </TouchableOpacity>
      {uploading ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius(compact ? 16 : 20), backgroundColor: COLORS.mediaScrim, alignItems: 'center', justifyContent: 'center' }}
        >
          <ActivityIndicator color={COLORS.textInverse} />
        </View>
      ) : null}
    </View>
  );
});
