import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { COLORS } from '@/constants/tokens';

export type VoiceRingMode = 'idle' | 'listening' | 'thinking' | 'speaking';

/** Mic RMS that fills the ring; normal speech sits around 0.03 to 0.1. */
const FULL_LEVEL = 0.1;
const MAX_GROWTH = 0.32;

/**
 * A soft ring behind the voice artwork that shows the call is alive: it
 * follows the user's voice while listening, breathes while Memento thinks,
 * and pulses while Memento speaks.
 */
export const VoiceLevelRing = memo(function VoiceLevelRing({
  mode,
  micLevel,
  size,
  children,
}: {
  mode: VoiceRingMode;
  micLevel: SharedValue<number>;
  size: number;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(pulse);
    if (reduceMotion || (mode !== 'thinking' && mode !== 'speaking')) {
      pulse.value = withTiming(0, { duration: 200 });
      return;
    }
    const period = mode === 'thinking' ? 700 : 450;
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: period }), withTiming(0.35, { duration: period })),
      -1,
      true,
    );
  }, [mode, pulse, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => {
    if (mode === 'listening') {
      const level = Math.min(micLevel.value / FULL_LEVEL, 1);
      return {
        opacity: withTiming(0.12 + level * 0.25, { duration: 90 }),
        transform: [{ scale: withTiming(1 + level * MAX_GROWTH, { duration: 90 }) }],
      };
    }
    let growth = 0;
    let opacity = 0;
    if (mode === 'thinking') {
      growth = 0.06 + pulse.value * 0.08;
      opacity = 0.12 + pulse.value * 0.12;
    } else if (mode === 'speaking') {
      growth = 0.08 + pulse.value * 0.16;
      opacity = 0.18 + pulse.value * 0.16;
    }
    return { opacity, transform: [{ scale: 1 + growth }] };
  }, [mode]);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2, backgroundColor: COLORS.brand },
          ringStyle,
        ]}
      />
      {children}
    </View>
  );
});
