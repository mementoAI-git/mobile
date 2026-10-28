import React, { useEffect } from 'react';
import { Image, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { DEEP_SKY } from '@/constants/appearance';

const CLOUDS = require('../../../assets/images/backgrounds/deep-sky-clouds.png');

/** Native rendering of the web sky artwork, with a UI-thread-only drift. */
export function DeepSkyBackdrop() {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = 0;
    if (!reducedMotion) {
      drift.value = withRepeat(withTiming(1, { duration: 46667, easing: Easing.inOut(Easing.ease) }), -1, true);
    }
    return () => cancelAnimation(drift);
  }, [drift, reducedMotion]);
  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (drift.value - 0.5) * width * 0.06 }, { translateY: -drift.value * height * 0.03 }, { scale: 1.08 + drift.value * 0.04 }],
  }));
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="absolute inset-0 overflow-hidden">
      <LinearGradient colors={[DEEP_SKY.canvas, DEEP_SKY.midpoint, DEEP_SKY.horizon]} locations={[0, 0.48, 1]} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
      <Animated.View style={[{ position: 'absolute', left: -width * 0.12, top: -height * 0.12, width: width * 1.24, height: height * 1.24 }, cloudStyle]}>
        <Image source={CLOUDS} resizeMode="cover" className="absolute inset-0 w-full h-full" style={{ opacity: 0.45 }} />
        <Image source={CLOUDS} resizeMode="cover" className="absolute inset-0 w-full h-full" style={{ opacity: 0.2, transform: [{ scale: 1.25 }] }} />
      </Animated.View>
    </View>
  );
}
