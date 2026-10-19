import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Disc3 from 'lucide-react-native/icons/disc-3';
import Play from 'lucide-react-native/icons/play';
import Square from 'lucide-react-native/icons/square';
import SkipBack from 'lucide-react-native/icons/skip-back';
import SkipForward from 'lucide-react-native/icons/skip-forward';
import { Button } from '@/components/ui/Button';
import { VolumeSlider } from '@/components/ui/VolumeSlider';
import { TYPE } from '@/constants/typography';
import { useAccountMusic } from '@/hooks/use-account-music';

export const MusicControllerCard = React.memo(function MusicControllerCard({ compact = false }: { compact?: boolean }) {
  const COLORS = useThemeColors();
  const { selectedTrack, isPlaying, isBusy, volume, setVolume, previous, toggle, next } = useAccountMusic();
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const discStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  useEffect(() => {
    if (isPlaying && !reducedMotion) {
      rotation.value = withRepeat(withTiming(rotation.value + 360, { duration: 6000, easing: Easing.linear }), -1, false);
    }
    return () => { cancelAnimation(rotation); };
  }, [isPlaying, reducedMotion, rotation]);
  const controlStyle = compact ? { width: 28, height: 28, minHeight: 28, borderRadius: 14, paddingHorizontal: 0, paddingVertical: 0 } : undefined;
  return (
    <View className="border border-stroke-weak bg-fill-weak" style={compact ? { borderRadius: 14, padding: 16, gap: 12 } : { borderRadius: 24, padding: 20, gap: 8 }}>
      <View className={compact ? "flex-row items-center gap-3" : "flex-row items-center gap-4"}>
        <View accessible={false} className="size-16 rounded-full bg-media-surface items-center justify-center shrink-0">
          <Animated.View style={discStyle}>
            <Disc3 size={compact ? 48 : 44} color={COLORS.textInverse} strokeWidth={1} />
          </Animated.View>
        </View>
        <View className="flex-1 min-w-0 gap-1">
          <Text className="text-text-base" style={compact ? TYPE.musicCaption : TYPE.metadata}>Music</Text>
          <Text accessibilityLiveRegion="polite" className="text-text-strong" numberOfLines={1} style={compact ? TYPE.musicTrack : TYPE.buttonSmall}>
            {selectedTrack.name}
          </Text>
          <View className="flex-row items-center gap-1">
            <Button iconOnly variant="ghost" size={compact ? "sm" : "md"} hitSlop={compact ? 8 : undefined} style={controlStyle} className={compact ? "w-7 px-0" : "w-11 px-0"} disabled={isBusy} onPress={previous} accessibilityLabel="Previous track">
              <SkipBack size={compact ? 16 : 18} color={COLORS.textStrong} />
            </Button>
            <Button iconOnly variant="outline" size={compact ? "sm" : "md"} hitSlop={compact ? 8 : undefined} style={controlStyle} className={compact ? "w-7 px-0" : "w-11 px-0"} disabled={isBusy} loading={isBusy} onPress={toggle} accessibilityLabel={isBusy ? 'Loading music' : isPlaying ? 'Stop music' : 'Play music'}>
              {isPlaying ? <Square size={16} color={COLORS.textStrong} /> : <Play size={compact ? 16 : 18} color={COLORS.textStrong} />}
            </Button>
            <Button iconOnly variant="ghost" size={compact ? "sm" : "md"} hitSlop={compact ? 8 : undefined} style={controlStyle} className={compact ? "w-7 px-0" : "w-11 px-0"} disabled={isBusy} onPress={next} accessibilityLabel="Next track">
              <SkipForward size={compact ? 16 : 18} color={COLORS.textStrong} />
            </Button>
          </View>
        </View>
      </View>
      <View style={compact ? { flexDirection: 'row', alignItems: 'center', gap: 8 } : undefined}>
        {compact ? (
          <Text className="text-text-base" style={TYPE.musicVolume}>Volume: {volume}%</Text>
        ) : (
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-text-base" style={TYPE.metadata}>Volume</Text>
            <Text className="text-text-base" style={TYPE.metadata}>{volume}%</Text>
          </View>
        )}
        <View style={compact ? { flex: 1 } : undefined}>
          <VolumeSlider value={volume} onChange={setVolume} variant={compact ? 'web' : 'default'} />
        </View>
      </View>
    </View>
  );
});
