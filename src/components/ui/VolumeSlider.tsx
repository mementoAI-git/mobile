import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';

interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  variant?: 'default' | 'web';
}

export function VolumeSlider({ value, onChange, variant = 'default' }: VolumeSliderProps) {
  const COLORS = useThemeColors();
  const web = variant === 'web';
  const thumbInset = web ? 10 : 8;
  const trackHeight = variant === 'web' ? 18 : 4;
  const [trackWidth, setTrackWidth] = useState(1);
  const progress = useSharedValue(value / 100);
  useEffect(() => { progress.value = value / 100; }, [value, progress]);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(Math.max(1, event.nativeEvent.layout.width - thumbInset * 2));
  }, [thumbInset]);
  const commit = useCallback((next: number) => {
    Haptics.selectionAsync();
    onChange(Math.max(0, Math.min(100, Math.round(next))));
  }, [onChange]);
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-3, 3])
      .failOffsetY([-12, 12])
      .onStart(event => {
        progress.value = Math.max(0, Math.min(1, (event.x - thumbInset) / trackWidth));
      })
      .onUpdate(event => {
        progress.value = Math.max(0, Math.min(1, (event.x - thumbInset) / trackWidth));
      })
      .onEnd(() => { scheduleOnRN(commit, progress.value * 100); })
      .onFinalize((_event, success) => {
        if (!success) progress.value = value / 100;
      });
    const tap = Gesture.Tap().onEnd((event, success) => {
      if (!success) return;
      progress.value = Math.max(0, Math.min(1, (event.x - thumbInset) / trackWidth));
      scheduleOnRN(commit, progress.value * 100);
    });
    return Gesture.Exclusive(pan, tap);
  }, [commit, progress, trackWidth, value, thumbInset]);
  const fillStyle = useAnimatedStyle(() => web
    ? { width: 9 + progress.value * trackWidth }
    : { transform: [{ scaleX: progress.value }] });
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * trackWidth }] }));
  const handleAccessibilityAction = useCallback((event: { nativeEvent: { actionName: string } }) => {
    if (event.nativeEvent.actionName === 'increment') commit(value + 5);
    if (event.nativeEvent.actionName === 'decrement') commit(value - 5);
  }, [commit, value]);
  const keyboardProps = Platform.OS === 'web' ? {
    tabIndex: 0 as const,
    onKeyDown: (event: { key: string; preventDefault: () => void }) => {
      const next = { ArrowRight: value + 5, ArrowUp: value + 5, ArrowLeft: value - 5, ArrowDown: value - 5, Home: 0, End: 100 }[event.key];
      if (next !== undefined) { event.preventDefault(); commit(next); }
    },
  } : {};

  return (
    <GestureDetector gesture={gesture} touchAction="pan-y">
      <View
        {...keyboardProps}
        collapsable={false}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Music volume"
        accessibilityValue={{ min: 0, max: 100, now: value, text: `${value}%` }}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}%`}
        accessibilityActions={[{ name: 'increment', label: 'Increase volume' }, { name: 'decrement', label: 'Decrease volume' }]}
        onAccessibilityAction={handleAccessibilityAction}
        onLayout={handleLayout}
        style={{ height: 44, justifyContent: 'center', paddingHorizontal: web ? 1 : 8, borderRadius: 999 }}
      >
        <View style={{ height: trackHeight, borderRadius: 999, backgroundColor: COLORS.strokeWeak, overflow: 'hidden', borderWidth: web ? 1 : 0, borderColor: COLORS.strokeWeak }}>
          <Animated.View style={[{ height: '100%', width: '100%', backgroundColor: COLORS.textWeak, transformOrigin: 'left center' }, fillStyle]} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: web ? 2 : 0 }}>
          <Animated.View style={thumbStyle}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.textStrong, borderWidth: web ? 1 : 2, borderColor: COLORS.card }} />
          </Animated.View>
        </View>
      </View>
    </GestureDetector>
  );
}
