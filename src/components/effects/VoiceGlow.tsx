import React, { useCallback, useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Group, Rect, RadialGradient, vec } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { VOICE_GLOW_PALETTE } from '@/constants/tokens';
import { useResolvedAppearance } from '@/hooks/use-theme-colors';
import { useAppActive, useReducedMotion } from './thinking-orb/theme';

/** Native rendering of the web VoiceBeam's sunset lobes; never captures audio. */
export function VoiceGlow({ active, level, height = 110 }: { active: boolean; level: () => number; height?: number }) {
  const appearance = useResolvedAppearance();
  const appActive = useAppActive();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const energy = useSharedValue(0);
  const phase = useSharedValue(0);
  const layout = useCallback((event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width), []);
  useEffect(() => {
    if (!active || !appActive) { energy.value = 0; return; }
    const id = setInterval(() => {
      const next = Math.min(1, Math.max(0, level()));
      if (next > 0 || energy.value > 0) energy.value = withTiming(next, { duration: 100 });
      if (!reduced && next > 0) phase.value = withTiming(performance.now() / 1800, { duration: 80 });
    }, 80);
    return () => clearInterval(id);
  }, [active, appActive, level, reduced, energy, phase]);
  const opacity = useDerivedValue(() => energy.value * 0.95);
  const transform = useDerivedValue(() => [{ translateY: 45 - energy.value * 38 }]);
  const colors = VOICE_GLOW_PALETTE[appearance === 'light' ? 'light' : 'dark'];
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={layout} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height }}>
    <Canvas style={{ flex: 1 }}>
      <Group opacity={opacity} transform={transform}>
        {colors.map((color, index) => <GlowLobe key={color} color={color} index={index} width={width} phase={phase} height={height} />)}
      </Group>
    </Canvas>
  </View>;
}

function GlowLobe({ color, index, width, phase, height }: { color: string; index: number; width: number; height: number; phase: import('react-native-reanimated').SharedValue<number> }) {
  const center = useDerivedValue(() => vec(width * (index + 0.5) / 7 + Math.sin(phase.value + index) * 12, height - 5));
  return <Rect x={-30} y={0} width={width + 60} height={height + 40}>
    <RadialGradient c={center} r={width * 0.32} colors={[color, color.replace('rgb(', 'rgba(').replace(')', ',0)')]} positions={[0, 1]} />
  </Rect>;
}
