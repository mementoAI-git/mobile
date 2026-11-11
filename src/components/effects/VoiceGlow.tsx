import React, { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Canvas, Circle, Group, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import {
  cancelAnimation, Easing, useDerivedValue, useSharedValue, withRepeat, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { VOICE_GLOW_PALETTE } from '@/constants/tokens';
import { useResolvedAppearance } from '@/hooks/use-theme-colors';
import { useAppActive, useReducedMotion } from './thinking-orb/theme';

/** The beam covers the bottom half of the screen and has faded out by the middle. */
const SCREEN_FRACTION = 0.5;
/** One trip of the light around the border, in ms. */
const FLOW_MS = 9000;
/** Border light while Memento is quiet, and at full voice. */
const EDGE_REST_OPACITY = 0.4;
const EDGE_SPEAK_OPACITY = 0.95;
/** Lights spaced around the border, their size at rest, and how much they grow with Memento's voice. */
const EDGE_GLOWS = 28;
const EDGE_GLOW_RADIUS = 56;
const EDGE_GLOW_SPEAK_GROWTH = 40;
/** Peak opacity of the waves along the base when Memento speaks at full level. */
const WAVE_OPACITY = 0.6;

/**
 * Native port of the web mobile VoiceBeam (`type="mobile"`). While voice mode is on, a soft
 * sunset light flows around the bottom and side edges of the screen, fading towards the
 * middle. When Memento speaks, independent waves swell along the base with the playback
 * level. Never captures audio.
 */
export function VoiceScreenBeam({ active, level }: { active: boolean; level: () => number }) {
  const appearance = useResolvedAppearance();
  const appActive = useAppActive();
  const reduced = useReducedMotion();
  const { width, height: screenHeight } = useWindowDimensions();
  const height = Math.round(screenHeight * SCREEN_FRACTION);
  const presence = useSharedValue(0);
  const speak = useSharedValue(0);
  const flow = useSharedValue(0);

  useEffect(() => {
    presence.value = withTiming(active ? 1 : 0, { duration: 400 });
  }, [active, presence]);

  useEffect(() => {
    if (!active || !appActive || reduced) return;
    flow.value = 0;
    flow.value = withRepeat(withTiming(1, { duration: FLOW_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(flow);
  }, [active, appActive, reduced, flow]);

  useEffect(() => {
    if (!active || !appActive) { speak.value = withTiming(0, { duration: 400 }); return; }
    const id = setInterval(() => {
      const next = Math.min(1, Math.max(0, level()));
      // Quick to rise, slow to settle, so speech reads as a swell rather than flicker.
      speak.value = withTiming(next, { duration: next > speak.value ? 140 : 450 });
    }, 80);
    return () => clearInterval(id);
  }, [active, appActive, level, speak]);

  const colors = VOICE_GLOW_PALETTE[appearance === 'light' ? 'light' : 'dark'];
  const edgeOpacity = useDerivedValue(() => presence.value * (EDGE_REST_OPACITY + speak.value * (EDGE_SPEAK_OPACITY - EDGE_REST_OPACITY)));
  const waveOpacity = useDerivedValue(() => presence.value * speak.value * WAVE_OPACITY);

  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height }}>
      <Canvas style={{ flex: 1 }}>
        <Group opacity={edgeOpacity}>
          {Array.from({ length: EDGE_GLOWS }, (_, index) => (
            <EdgeGlow key={index} index={index} color={colors[index % colors.length]} width={width} height={height} speak={speak} flow={flow} />
          ))}
        </Group>
        <Group opacity={waveOpacity}>
          {colors.map((color, index) => (
            <Wave key={color} color={color} index={index} count={colors.length} width={width} height={height} speak={speak} flow={flow} />
          ))}
        </Group>
      </Canvas>
    </View>
  );
}

/** A point on the lower border, walked from the left edge at mid-screen, along the bottom, up the right edge. */
function borderPoint(t: number, width: number, height: number) {
  'worklet';
  const length = height * 2 + width;
  const along = (((t % 1) + 1) % 1) * length;
  if (along < height) return { x: 0, y: along };
  if (along < height + width) return { x: along - height, y: height };
  return { x: width, y: height - (along - height - width) };
}

/**
 * One soft light travelling around the border. Centred on the edge so only its
 * inner half shows; it dims as it climbs the sides towards the middle.
 */
function EdgeGlow({ index, color, width, height, speak, flow }: {
  index: number; color: string; width: number; height: number; speak: SharedValue<number>; flow: SharedValue<number>;
}) {
  const transparent = color.replace('rgb(', 'rgba(').replace(')', ',0)');
  const center = useDerivedValue(() => {
    const point = borderPoint(index / EDGE_GLOWS + flow.value, width, height);
    return vec(point.x, point.y);
  });
  const radius = useDerivedValue(() => EDGE_GLOW_RADIUS + speak.value * EDGE_GLOW_SPEAK_GROWTH);
  // Full strength at the bottom, gone by the middle of the screen.
  const opacity = useDerivedValue(() => {
    const point = borderPoint(index / EDGE_GLOWS + flow.value, width, height);
    return Math.pow(point.y / height, 1.5);
  });
  return (
    <Group opacity={opacity}>
      <Circle c={center} r={radius}>
        <RadialGradient c={center} r={radius} colors={[color, transparent]} />
      </Circle>
    </Group>
  );
}

/** One wave along the base: its own rhythm, so the swell moves instead of stacking into a spike. */
function Wave({ color, index, count, width, height, speak, flow }: {
  color: string; index: number; count: number; width: number; height: number; speak: SharedValue<number>; flow: SharedValue<number>;
}) {
  const radius = width * 0.42;
  const x = width * (index / (count - 1)) * 1.1 - width * 0.05;
  const origin = vec(x, height);
  const transform = useDerivedValue(() => {
    const rhythm = 0.5 + 0.5 * Math.sin(flow.value * Math.PI * 2 * (3 + (index % 3)) + index * 1.7);
    return [{ scaleY: 0.5 + speak.value * (0.5 + 1.1 * rhythm) }];
  });
  return (
    <Group origin={origin} transform={transform}>
      <Rect x={x - radius} y={height - radius} width={radius * 2} height={radius}>
        <RadialGradient c={origin} r={radius} colors={[color, color.replace('rgb(', 'rgba(').replace(')', ',0)')]} />
      </Rect>
    </Group>
  );
}
