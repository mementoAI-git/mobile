import React, { useEffect } from 'react';
import { Image, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SKY_BACKDROPS } from '@/constants/appearance';
import type { SkyAppearance } from '@/features/appearance/appearance';

const CLOUDS = require('../../../assets/images/backgrounds/deep-sky-clouds.png');

/** Native rendering of the web sky artwork (Deep Sky or Light Sky), with a UI-thread-only drift. */
export function DeepSkyBackdrop({ sky = 'deep-sky' }: { sky?: SkyAppearance }) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const drift = useSharedValue(0);
  const { gradient, cloudTint, cloudOpacity, driftMs } = SKY_BACKDROPS[sky];
  useEffect(() => {
    drift.value = 0;
    if (!reducedMotion) {
      drift.value = withRepeat(withTiming(1, { duration: driftMs, easing: Easing.inOut(Easing.ease) }), -1, true);
    }
    return () => cancelAnimation(drift);
  }, [drift, reducedMotion, driftMs]);
  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (drift.value - 0.5) * width * 0.06 }, { translateY: -drift.value * height * 0.03 }, { scale: 1.08 + drift.value * 0.04 }],
  }));
  // Light Sky draws the clouds as white silhouettes, like web's brightness(0) invert(1).
  const tint = cloudTint ? { tintColor: cloudTint } : null;
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="absolute inset-0 overflow-hidden">
      <LinearGradient colors={gradient} locations={[0, 0.48, 1]} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
      <Animated.View style={[{ position: 'absolute', left: -width * 0.12, top: -height * 0.12, width: width * 1.24, height: height * 1.24 }, cloudStyle]}>
        <Image source={CLOUDS} resizeMode="cover" className="absolute inset-0 w-full h-full" style={[{ opacity: cloudOpacity[0] }, tint]} />
        <Image source={CLOUDS} resizeMode="cover" className="absolute inset-0 w-full h-full" style={[{ opacity: cloudOpacity[1], transform: [{ scale: 1.25 }] }, tint]} />
      </Animated.View>
    </View>
  );
}
