import React, { useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { COLORS } from '@/constants/tokens';

const LOGO_3D = require('../../../assets/splash-icon.jpg');
const LOGO_FLAT = require('../../../assets/images/memento_flat.png');

interface AnimatedSplashProps {
  onDone: () => void;
}

export function AnimatedSplash({ onDone }: AnimatedSplashProps) {
  const { width, height } = useWindowDimensions();
  
  // Animation values
  const bgOpacity = useSharedValue(1);
  const logo3dScale = useSharedValue(1);
  const logo3dOpacity = useSharedValue(1);
  const logoFlatOpacity = useSharedValue(0);
  const logoFlatScale = useSharedValue(0.9);
  
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // 1. Hold 3D logo briefly
    // 2. Shrink and fade out 3D logo
    logo3dScale.value = withDelay(
      800,
      withTiming(0.8, { duration: 400, easing: Easing.out(Easing.ease) })
    );
    logo3dOpacity.value = withDelay(
      900,
      withTiming(0, { duration: 300 })
    );

    // 3. Fade in and spring up the flat logo
    logoFlatScale.value = withDelay(
      1000,
      withSpring(1, { damping: 15, stiffness: 100 })
    );
    logoFlatOpacity.value = withDelay(
      1000,
      withTiming(1, { duration: 400 })
    );

    // 4. Fade out entire splash background
    bgOpacity.value = withDelay(
      2200, // Hold flat logo for ~1s
      withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(setAnimationComplete)(true);
          runOnJS(onDone)();
        }
      })
    );
  }, []);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const logo3dStyle = useAnimatedStyle(() => ({
    opacity: logo3dOpacity.value,
    transform: [{ scale: logo3dScale.value }],
  }));

  const logoFlatStyle = useAnimatedStyle(() => ({
    opacity: logoFlatOpacity.value,
    transform: [{ scale: logoFlatScale.value }],
  }));

  if (animationComplete) return null;

  return (
    <Animated.View style={[styles.container, { width, height }, bgStyle]}>
      {/* 3D App Icon */}
      <Animated.Image
        source={LOGO_3D}
        style={[styles.logo3d, logo3dStyle]}
        resizeMode="contain"
      />
      
      {/* Flat Brand Wordmark/Logo */}
      <Animated.Image
        source={LOGO_FLAT}
        style={[styles.logoFlat, logoFlatStyle]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.background, // Should match app.json splash bg
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Ensure it's on top of everything
  },
  logo3d: {
    width: 120, // Match typical splash icon size
    height: 120,
    position: 'absolute',
  },
  logoFlat: {
    width: 200, // Adjust based on your flat logo aspect ratio
    height: 60,
    position: 'absolute',
  },
});