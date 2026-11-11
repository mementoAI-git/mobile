import React, { useEffect, useSyncExternalStore } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BlurMask, Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Rect, Skia, SweepGradient, vec,
} from '@shopify/react-native-skia';
import {
  cancelAnimation, Easing, useDerivedValue, useSharedValue, withRepeat, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { VOICE_GLOW_PALETTE } from '@/constants/tokens';
import { useResolvedAppearance } from '@/hooks/use-theme-colors';
import { useAppActive, useReducedMotion } from './thinking-orb/theme';

/** The beam covers the bottom half of the screen and has faded out by the middle. */
const SCREEN_FRACTION = 0.5;
/** One trip of the colours around the border, in ms. */
const FLOW_MS = 7000;
/** Corner radius of phones with a home indicator, so the light follows the glass. */
const DEVICE_CORNER_RADIUS = 52;
/** The thin light right on the edge, and the soft halo it throws inwards. */
const EDGE_LINE_WIDTH = 2;
const HALO_WIDTH = 8;
const HALO_SPEAK_GROWTH = 72;
/** Halo softness at rest, and how much softer it gets at full voice. */
const HALO_BLUR = 5;
const HALO_SPEAK_BLUR = 17;
/** Overall strength while Memento is quiet, and at full voice. */
const REST_OPACITY = 0.8;
const SPEAK_OPACITY = 1;
/** Lobes of the swell that rises from the base while Memento speaks. */
const LOBES = 5;
const LOBE_HEIGHT = 0.32;

/**
 * Native port of the web mobile VoiceBeam (`type="mobile"`). While voice mode
 * is on, light flows around the bottom and sides of the screen, following the
 * rounded corners and fading out by the middle. When Memento speaks, the edge
 * brightens and a soft swell rises from the base with the playback level.
 * Never captures audio.
 */
export function VoiceScreenBeam({ active, level }: { active: boolean; level: () => number }) {
  const appearance = useResolvedAppearance();
  const appActive = useAppActive();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();
  const height = Math.round(screenHeight * SCREEN_FRACTION);
  const radius = insets.bottom > 0 ? DEVICE_CORNER_RADIUS : 0;
  const presence = useSharedValue(0);
  const speak = useSharedValue(0);
  const flow = useSharedValue(0);

  useEffect(() => {
    presence.value = withTiming(active ? 1 : 0, { duration: 500 });
  }, [active, presence]);

  useEffect(() => {
    if (!active || !appActive || reduced) return;
    flow.value = 0;
    flow.value = withRepeat(withTiming(1, { duration: FLOW_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(flow);
  }, [active, appActive, reduced, flow]);

  useEffect(() => {
    if (!active || !appActive) { speak.value = withTiming(0, { duration: 500 }); return; }
    const id = setInterval(() => {
      const next = Math.min(1, Math.max(0, level()));
      // Follows each syllable like an equaliser: quick to rise, a touch slower to fall.
      speak.value = withTiming(next, { duration: next > speak.value ? 70 : 220 });
    }, 50);
    return () => clearInterval(id);
  }, [active, appActive, level, speak]);

  const dark = appearance !== 'light';
  const palette = VOICE_GLOW_PALETTE[dark ? 'dark' : 'light'];
  // Bright and dim stops alternate, so patches of light travel along the border.
  // The last stop repeats the first exactly, so the loop has no seam.
  const stops = palette.map((color, index) => (index % 2 === 0 ? color : withAlpha(color, 0.35)));
  const sweepColors = [...stops, stops[0]];
  const lineInset = EDGE_LINE_WIDTH / 2;
  const edge = borderPath(width, height, radius, 0);
  const line = borderPath(width, height, Math.max(0, radius - lineInset), lineInset);
  const center = vec(width / 2, 0);

  const opacity = useDerivedValue(() => presence.value * (REST_OPACITY + speak.value * (SPEAK_OPACITY - REST_OPACITY)));
  const haloWidth = useDerivedValue(() => HALO_WIDTH + speak.value * HALO_SPEAK_GROWTH);
  const haloBlur = useDerivedValue(() => HALO_BLUR + speak.value * HALO_SPEAK_BLUR);
  const sweep = useDerivedValue(() => [{ rotate: flow.value * Math.PI * 2 }]);

  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height }}>
      <Canvas style={{ flex: 1 }}>
        <Group layer opacity={opacity}>
          <Path path={edge} style="stroke" strokeWidth={haloWidth} opacity={dark ? 0.9 : 0.75}>
            <SweepGradient c={center} colors={sweepColors} origin={center} transform={sweep} />
            <BlurMask blur={haloBlur} style="normal" />
          </Path>
          {Array.from({ length: LOBES }, (_, index) => (
            <Lobe key={index} index={index} color={palette[(index * 2) % palette.length]} width={width} height={height} speak={speak} flow={flow} />
          ))}
          <Path path={line} style="stroke" strokeWidth={EDGE_LINE_WIDTH}>
            <SweepGradient c={center} colors={sweepColors} origin={center} transform={sweep} />
            <BlurMask blur={1.5} style="solid" />
          </Path>
          {/* Fades everything out towards the middle of the screen. */}
          <Rect x={0} y={0} width={width} height={height} blendMode="dstIn">
            <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,1)']} positions={[0, 0.4, 1]} />
          </Rect>
        </Group>
      </Canvas>
    </View>
  );
}

/** The lower border, from the left edge at mid-screen, round the bottom corners, up the right edge. */
function borderPath(width: number, height: number, radius: number, inset: number) {
  const path = Skia.Path.Make();
  const left = inset;
  const right = width - inset;
  const bottom = height - inset;
  path.moveTo(left, 0);
  path.lineTo(left, bottom - radius);
  path.quadTo(left, bottom, left + radius, bottom);
  path.lineTo(right - radius, bottom);
  path.quadTo(right, bottom, right, bottom - radius);
  path.lineTo(right, 0);
  return path;
}

function withAlpha(color: string, alpha: number) {
  return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
}

/**
 * One soft lobe of the swell along the base. Each has its own rhythm and drifts
 * sideways, so speech moves across the base instead of pumping in one place.
 */
function Lobe({ index, color, width, height, speak, flow }: {
  index: number; color: string; width: number; height: number; speak: SharedValue<number>; flow: SharedValue<number>;
}) {
  // A circle centred on the base, squashed into a wide ellipse: the radial
  // gradient fades to nothing at its rim, so there is never a hard edge.
  const radius = width * 0.36;
  const maxScale = (height * LOBE_HEIGHT) / radius;
  const center = useDerivedValue(() => {
    const drift = Math.sin(flow.value * Math.PI * 2 + index * 1.3) * width * 0.1;
    return vec((width * (index + 0.5)) / LOBES + drift, height);
  });
  const transform = useDerivedValue(() => {
    const phase = flow.value * Math.PI * 2;
    const rhythm = 0.55 + 0.45 * Math.sin(phase * (2 + (index % 3)) + index * 1.9);
    return [{ scaleY: Math.max(0.001, speak.value * maxScale * rhythm) }];
  });
  return (
    <Group origin={center} transform={transform}>
      <Circle c={center} r={radius} opacity={0.55}>
        <RadialGradient c={center} r={radius} colors={[color, withAlpha(color, 0.4), withAlpha(color, 0)]} positions={[0, 0.45, 1]} />
      </Circle>
    </Group>
  );
}

/* Screens that draw the beam themselves (behind their own content) hide the app-wide one. */
let hosts = 0;
const listeners = new Set<() => void>();
function notify() { listeners.forEach((listener) => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

/** While `hosting`, this screen draws the beam itself and the app-wide one stands aside. */
export function useHostVoiceBeam(hosting: boolean) {
  useEffect(() => {
    if (!hosting) return;
    hosts += 1;
    notify();
    return () => { hosts -= 1; notify(); };
  }, [hosting]);
}

/** Whether a screen is drawing the beam itself. */
export function useVoiceBeamHosted() {
  return useSyncExternalStore(subscribe, () => hosts > 0);
}
