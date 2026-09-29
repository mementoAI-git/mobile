import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Play, Pause, X, RotateCcw, Volume2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { radius, iconSize, minTouchTarget } from '@/constants/responsive';
import {
  type NarrationTrack,
  type PlaybackSpeed,
  formatNarrationTime,
  calculateNarrationProgress,
  getNextPlaybackSpeed,
} from '@/features/audio/narration-player';

interface StoryNarrationPlayerProps {
  track: NarrationTrack;
  onClose: () => void;
  visible?: boolean;
}

export function StoryNarrationPlayer({
  track,
  onClose,
  visible = true,
}: StoryNarrationPlayerProps) {
  const [speed, setSpeed] = useState<PlaybackSpeed>(1.0);
  const player = useAudioPlayer(track.audioUrl ? { uri: track.audioUrl } : null);

  const isPlaying = Boolean(player?.playing);
  const currentTime = player?.currentTime ?? 0;
  const duration = player?.duration ?? track.duration ?? 60;
  const progress = calculateNarrationProgress(currentTime, duration);

  const togglePlayPause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPlaying) {
      player?.pause();
    } else {
      player?.play();
    }
  }, [isPlaying, player]);

  const cycleSpeed = useCallback(() => {
    Haptics.selectionAsync();
    const nextSpeed = getNextPlaybackSpeed(speed);
    setSpeed(nextSpeed);
    if (player) {
      player.playbackRate = nextSpeed;
    }
  }, [player, speed]);

  const handleClose = useCallback(() => {
    Haptics.selectionAsync();
    player?.pause();
    onClose();
  }, [onClose, player]);

  if (!visible || !track) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      exiting={FadeOutDown.duration(200)}
      style={{
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        backgroundColor: COLORS.card,
        borderRadius: radius(24),
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.strokeWeak,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        gap: 12,
      }}
    >
      {/* Top row: Track info & Dismiss */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius(18),
              backgroundColor: 'rgba(255, 94, 0, 0.1)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Volume2 size={iconSize(18)} color={COLORS.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                ...TYPE.body,
                color: COLORS.textStrong,
              }}
            >
              {track.title}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                ...TYPE.metadata,
                color: COLORS.textWeak,
              }}
            >
              {track.author ? `By ${track.author}` : 'Narration'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.7}
          hitSlop={10}
          style={{
            width: 32,
            height: 32,
            borderRadius: radius(16),
            backgroundColor: COLORS.fillWeak,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={iconSize(16)} color={COLORS.textBase} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={{ gap: 4 }}>
        <View
          style={{
            height: 4,
            width: '100%',
            backgroundColor: COLORS.fillWeak,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: COLORS.brand,
              borderRadius: 2,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ ...TYPE.eyebrow, color: COLORS.textMuted }}>
            {formatNarrationTime(currentTime)}
          </Text>
          <Text style={{ ...TYPE.eyebrow, color: COLORS.textMuted }}>
            {formatNarrationTime(duration)}
          </Text>
        </View>
      </View>

      {/* Playback Controls Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
        {/* Speed multiplier */}
        <TouchableOpacity
          onPress={cycleSpeed}
          activeOpacity={0.7}
          hitSlop={8}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: radius(12),
            backgroundColor: COLORS.fillWeak,
          }}
        >
          <Text style={{ ...TYPE.metadata, color: COLORS.textStrong }}>
            {speed}x
          </Text>
        </TouchableOpacity>

        {/* Center: Play / Pause */}
        <TouchableOpacity
          onPress={togglePlayPause}
          activeOpacity={0.8}
          style={{
            width: minTouchTarget(48),
            height: minTouchTarget(48),
            borderRadius: radius(24),
            backgroundColor: COLORS.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isPlaying ? (
            <Pause size={iconSize(20)} color="white" fill="white" />
          ) : (
            <Play size={iconSize(20)} color="white" fill="white" style={{ marginLeft: 2 }} />
          )}
        </TouchableOpacity>

        {/* Placeholder balancer to keep play button centered */}
        <View style={{ width: 40 }} />
      </View>
    </Animated.View>
  );
}
