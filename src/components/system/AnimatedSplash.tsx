import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS } from '@/constants/tokens';

const LOGO_3D = require('../../../assets/splash-icon.jpg');
const LOGO_FLAT = require('../../../assets/images/memento_flat.webp');

const WORD = 'Memento.';

const ICON_SIZE = 120;

// Timeline
const ENTRANCE_DELAY = 80;
const MORPH_DURATION = 1050;

const SHINE_START = 980;
const SHINE_DURATION = 380;

const WORD_START = 1180;
const WORD_DURATION = 620;

const EXIT_START = 1880;
const EXIT_DURATION = 320;

interface AnimatedSplashProps {
  onDone: () => void;
}

interface AnimatedLetterProps {
  character: string;
  index: number;
  total: number;
  progress: SharedValue<number>;
}

function AnimatedLetter({
  character,
  index,
  total,
  progress,
}: AnimatedLetterProps) {
  const style = useAnimatedStyle(() => {
    // Each letter gets its own small reveal window.
    const stagger = 0.62 / Math.max(total - 1, 1);

    const start = index * stagger;
    const end = Math.min(start + 0.32, 1);

    const opacity = interpolate(
      progress.value,
      [start, end],
      [0, 1],
      Extrapolation.CLAMP,
    );

    const translateY = interpolate(
      progress.value,
      [start, end],
      [5, 0],
      Extrapolation.CLAMP,
    );

    const scale = interpolate(
      progress.value,
      [start, end],
      [0.97, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [
        { translateY },
        { scale },
      ],
    };
  });

  return (
    <Animated.Text style={[styles.wordmarkLetter, style]}>
      {character}
    </Animated.Text>
  );
}

export function AnimatedSplash({ onDone }: AnimatedSplashProps) {
  const morph = useSharedValue(0);
  const shine = useSharedValue(0);
  const wordmark = useSharedValue(0);
  const exit = useSharedValue(0);

  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const finishSplash = () => {
    setVisible(false);
    onDoneRef.current();
  };

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      // Accessible version:
      // flat mark + wordmark → short fade into app.
      morph.value = 1;

      wordmark.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      });

      exit.value = withDelay(
        650,
        withTiming(
          1,
          {
            duration: 250,
            easing: Easing.inOut(Easing.ease),
          },
          finished => {
            if (finished) {
              runOnJS(finishSplash)();
            }
          },
        ),
      );

      return;
    }

    /**
     * 1. 3D icon rotates into its face-on position.
     *    Near the end, the actual flat asset takes over.
     */
    morph.value = withDelay(
      ENTRANCE_DELAY,
      withTiming(1, {
        duration: MORPH_DURATION,
        easing: Easing.bezier(0.22, 0.82, 0.32, 1),
      }),
    );

    /**
     * 2. Quick restrained highlight over the final flat asset.
     */
    shine.value = withDelay(
      SHINE_START,
      withTiming(1, {
        duration: SHINE_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
    );

    /**
     * 3. Memento. reveals underneath.
     */
    wordmark.value = withDelay(
      WORD_START,
      withTiming(1, {
        duration: WORD_DURATION,
        easing: Easing.out(Easing.cubic),
      }),
    );

    /**
     * 4. Entire brand lockup subtly lifts/fades,
     * revealing the actual first screen underneath.
     */
    exit.value = withDelay(
      EXIT_START,
      withTiming(
        1,
        {
          duration: EXIT_DURATION,
          easing: Easing.inOut(Easing.cubic),
        },
        finished => {
          if (finished) {
            runOnJS(finishSplash)();
          }
        },
      ),
    );
  }, [reduceMotion]);

  /**
   * 3D ICON
   *
   * Starts slightly edge-on.
   * Passes front-facing very slightly.
   * Settles.
   * Then disappears as the real flat asset takes over.
   */
const logo3dStyle = useAnimatedStyle(() => {
  const rotateY = interpolate(
    morph.value,
    [0, 0.55, 0.78, 1],
    [58, -7, 2.5, 0],
    Extrapolation.CLAMP,
  );

  const rotateX = interpolate(
    morph.value,
    [0, 0.55, 0.78, 1],
    [4, -2, 1, 0],
    Extrapolation.CLAMP,
  );

  const scale = interpolate(
    morph.value,
    [0, 0.55, 0.78, 1],
    [0.88, 1.045, 0.99, 1],
    Extrapolation.CLAMP,
  );

  const opacity = interpolate(
    morph.value,
    [0, 0.12, 0.72, 0.84, 0.9],
    [0, 1, 1, 0.35, 0],
    Extrapolation.CLAMP,
  );

  return {
    opacity,
    transform: [
      { perspective: 850 },
      { rotateY: `${rotateY}deg` },
      { rotateX: `${rotateX}deg` },
      { scale },
    ],
  };
});

  /**
   * FLAT ICON
   *
   * Doesn't simply "appear".
   * It starts taking over exactly as the 3D object
   * becomes face-on.
   */
const flatLogoStyle = useAnimatedStyle(() => {
  const opacity = interpolate(
    morph.value,
    [0.72, 0.82, 0.9],
    [0, 0.65, 1],
    Extrapolation.CLAMP,
  );

  const scale = interpolate(
    morph.value,
    [0.72, 0.9],
    [0.985, 1],
    Extrapolation.CLAMP,
  );

  return {
    opacity,
    transform: [{ scale }],
  };
});

  /**
   * Shine moves completely through the icon.
   */
  const shineStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shine.value,
      [0, 1],
      [-ICON_SIZE, ICON_SIZE * 1.5],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      shine.value,
      [0, 0.08, 0.75, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [
        { translateX },
        { rotate: '14deg' },
      ],
    };
  });

  /**
   * Exit is deliberately not just opacity.
   * The lockup subtly recedes and rises.
   */
  const brandExitStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      exit.value,
      [0, 1],
      [1, 0],
      Extrapolation.CLAMP,
    );

    const translateY = interpolate(
      exit.value,
      [0, 1],
      [0, -10],
      Extrapolation.CLAMP,
    );

    const scale = interpolate(
      exit.value,
      [0, 1],
      [1, 0.975],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [
        { translateY },
        { scale },
      ],
    };
  });

  /**
   * Background disappears slightly behind the brand.
   * Your real first screen is already mounted underneath.
   */
  const backgroundStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      exit.value,
      [0, 0.25, 1],
      [1, 1, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
    };
  });

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.container,
        backgroundStyle,
      ]}
    >
      <Animated.View
        style={[
          styles.brand,
          brandExitStyle,
        ]}
      >
        <View style={styles.iconStage}>

          {/* 3D source */}
          <Animated.Image
            source={LOGO_3D}
            resizeMode="contain"
            style={[
              styles.icon,
              logo3dStyle,
            ]}
          />

          {/* Actual final flat logo */}
          <Animated.Image
            source={LOGO_FLAT}
            resizeMode="contain"
            style={[
              styles.icon,
              flatLogoStyle,
            ]}
          />

          {/* Shine is clipped to the actual flat icon alpha */}
          {!reduceMotion && (
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                flatLogoStyle,
              ]}
            >
              <MaskedView
                style={StyleSheet.absoluteFill}
                maskElement={
                  <ImageMask />
                }
              >
                <View style={styles.shineMaskFill}>
                  <Animated.View
                    style={[
                      styles.shine,
                      shineStyle,
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        'rgba(255,255,255,0)',
                        'rgba(255,255,255,0.12)',
                        'rgba(255,255,255,0.55)',
                        'rgba(255,255,255,0.12)',
                        'rgba(255,255,255,0)',
                      ]}
                      locations={[
                        0,
                        0.3,
                        0.5,
                        0.7,
                        1,
                      ]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                </View>
              </MaskedView>
            </Animated.View>
          )}
        </View>

        {/* Brand name */}
        <View style={styles.wordmark}>
          {WORD.split('').map((character, index) => (
            <AnimatedLetter
              key={`${character}-${index}`}
              character={character}
              index={index}
              total={WORD.length}
              progress={wordmark}
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function ImageMask() {
  return (
    <Animated.Image
      source={LOGO_FLAT}
      resizeMode="contain"
      style={styles.maskImage}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,

    backgroundColor: COLORS.background,

    alignItems: 'center',
    justifyContent: 'center',

    zIndex: 9999,
  },

  brand: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconStage: {
    width: ICON_SIZE,
    height: ICON_SIZE,

    position: 'relative',

    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,

    position: 'absolute',

    top: 0,
    left: 0,
  },

  maskImage: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },

  shineMaskFill: {
    width: ICON_SIZE,
    height: ICON_SIZE,

    overflow: 'hidden',
  },

  shine: {
    position: 'absolute',

    top: -ICON_SIZE * 0.35,

    width: 34,
    height: ICON_SIZE * 1.7,
  },

  wordmark: {
    marginTop: 22,

    height: 48,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  wordmarkLetter: {
    fontFamily: Platform.select({
      ios: 'Iowan Old Style',
      android: 'serif',
      default: 'serif',
    }),

    fontSize: 36,
    lineHeight: 44,

    fontWeight: '400',

    // color: '#000000',
    color: COLORS.textStrong,

    letterSpacing: 0.25,
  },
});