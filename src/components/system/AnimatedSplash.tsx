import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ImageBackground,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  cancelAnimation,
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

import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import {
  CINEMATIC_SPLASH,
  CINEMATIC_SPLASH_CARDS,
  CINEMATIC_SPLASH_PARTICLES,
  CINEMATIC_SPLASH_WORDS,
  type CinematicSplashCard,
} from '@/features/startup/cinematic-splash';

const JOURNAL = require('../../../assets/images/splash-cinematic/journal.webp');
const HUG = require('../../../assets/images/splash-cinematic/hug.webp');
const TYPEWRITER = require('../../../assets/images/splash-cinematic/typewriter.webp');
const PHONE = require('../../../assets/images/splash-cinematic/phone.webp');
const AVATAR_ONE = require('../../../assets/images/splash-cinematic/avatar-1.webp');
const AVATAR_TWO = require('../../../assets/images/splash-cinematic/avatar-2.webp');
const AVATAR_THREE = require('../../../assets/images/splash-cinematic/avatar-3.webp');
const LOGO_MARK = require('../../../assets/images/splash-cinematic/memento_mark.webp');
const GRAIN = require('../../../assets/images/backgrounds/welcome_bg.png');

const CARD_IMAGES: Record<CinematicSplashCard['id'], ImageSourcePropType> = {
  journal: JOURNAL,
  hug: HUG,
  typewriter: TYPEWRITER,
  phone: PHONE,
};

const CHIP_COLORS: Record<CinematicSplashCard['tone'], string> = {
  mint: COLORS.splashChipMint,
  peach: COLORS.splashChipPeach,
  rose: COLORS.splashChipRose,
  sky: COLORS.splashChipSky,
};

const SOFT = Easing.bezierFn(0.4, 0, 0.2, 1);

interface AnimatedSplashProps {
  onDone?: () => void;
  onReady?: () => Promise<void>;
  /**
   * Speed multiplier for the clock. 1 = full 8s cinematic (first launch),
   * 2 = 4s compressed replay (returning user).
   */
  replaySpeed?: number;
  /** Keep the splash on-screen without disappearing after the animation completes */
  persistOnDone?: boolean;
  /** Automatically loop the animation continuously */
  loop?: boolean;
}

function phase(value: number, start: number, duration: number) {
  'worklet';
  const raw = Math.max(0, Math.min(1, (value - start) / duration));
  return 1 - Math.pow(1 - raw, 4);
}

function softPhase(value: number, start: number, duration: number) {
  'worklet';
  const raw = Math.max(0, Math.min(1, (value - start) / duration));
  return raw * raw * (3 - 2 * raw);
}

interface ClockProps {
  clock: SharedValue<number>;
}

const CinematicBackdrop = memo(function CinematicBackdrop({ clock }: ClockProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const t = phase(clock.value, 0, 600);
    return { opacity: t };
  });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animatedStyle]}>
      <LinearGradient
        colors={[COLORS.splashSky, COLORS.splashPeach, COLORS.splashPaper]}
        locations={[0, 0.52, 1]}
        style={styles.sky}
      />
      <LinearGradient
        colors={[COLORS.splashTransparent, COLORS.splashPaper, COLORS.card]}
        locations={[0, 0.18, 1]}
        style={styles.paper}
      />
    </Animated.View>
  );
});

interface ParticleProps extends ClockProps {
  height: number;
  left: number;
  size: number;
  delay: number;
}

const Particle = memo(function Particle({ clock, height, left, size, delay }: ParticleProps) {
  const animatedStyle = useAnimatedStyle(() => {
    if (clock.value < delay) return { opacity: 0, transform: [{ translateY: 0 }] };
    const t = ((clock.value - delay) % 3_400) / 3_400;
    return {
      opacity: interpolate(t, [0, 0.18, 1], [0, 0.7, 0], Extrapolation.CLAMP),
      transform: [{ translateY: -height * 0.72 * t }, { scale: 0.6 + 0.4 * t }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.particle,
        { left, width: size, height: size, borderRadius: size / 2 },
        animatedStyle,
      ]}
    />
  );
});

interface MemoryCardProps extends ClockProps {
  card: CinematicSplashCard;
  stageWidth: number;
  stageHeight: number;
}

const CinematicMemoryCard = memo(function CinematicMemoryCard({
  card,
  clock,
  stageWidth,
  stageHeight,
}: MemoryCardProps) {
  const width = stageWidth * card.width;
  const animatedStyle = useAnimatedStyle(() => {
    const t = phase(clock.value, card.start, 1_150);
    return {
      opacity: t,
      transform: [
        { translateY: width * 1.2 * (1 - t) },
        { rotate: `${card.startRotation + (card.rotation - card.startRotation) * t}deg` },
        { scale: 0.9 + 0.1 * t },
      ],
    };
  });
  const developmentStyle = useAnimatedStyle(() => {
    const t = softPhase(clock.value, card.start + 350, 1_050);
    return { opacity: 0.8 * (1 - t) };
  });
  const chipStyle = useAnimatedStyle(() => {
    const t = phase(clock.value, card.start + 720, 450);
    return {
      opacity: t,
      transform: [{ translateY: 6 * (1 - t) }, { scale: 0.96 + 0.04 * t }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.memoryCard,
        { top: stageHeight * card.top, left: stageWidth * card.left, width },
        animatedStyle,
      ]}
    >
      <View style={[styles.memoryPhoto, { height: Math.round(width * 0.714) }]}>
        <Animated.Image source={CARD_IMAGES[card.id]} resizeMode="cover" style={StyleSheet.absoluteFill} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.development, developmentStyle]} />
      </View>
      <Animated.View
        style={[styles.memoryChip, { backgroundColor: CHIP_COLORS[card.tone] }, chipStyle]}
      >
        <Text numberOfLines={1} style={styles.memoryChipText}>{card.chip}</Text>
      </Animated.View>
    </Animated.View>
  );
});

const Sparkle = memo(function Sparkle({ clock, stageWidth, stageHeight }: ClockProps & {
  stageWidth: number;
  stageHeight: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const t = phase(clock.value, CINEMATIC_SPLASH.sparkleStart, CINEMATIC_SPLASH.sparkleDuration);
    const twinkleTime = Math.max(0, clock.value - 2_100);
    const twinkle = clock.value < 2_100
      ? 0.5
      : (1 - Math.cos((twinkleTime / 2_800) * Math.PI * 2)) / 2;
    return {
      opacity: t * (0.7 + 0.3 * twinkle),
      transform: [
        { scale: (0.4 + 0.6 * t) * (0.92 + 0.16 * twinkle) },
        { rotate: `${-20 * (1 - t) + 12 * twinkle}deg` },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sparkle, { top: stageHeight * 0.102, left: stageWidth * 0.08 }, animatedStyle]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 32 32">
        <Path
          fill={COLORS.splashSparkle}
          d="M16 .6 18.4 13.6 32 16 18.4 18.4 16 31.4 13.6 18.4 0 16 13.6 13.6Z"
        />
      </Svg>
    </Animated.View>
  );
});

const PromptCard = memo(function PromptCard({ clock, stageWidth, stageHeight }: ClockProps & {
  stageWidth: number;
  stageHeight: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const t = phase(clock.value, CINEMATIC_SPLASH.promptStart, CINEMATIC_SPLASH.promptDuration);
    return {
      opacity: t,
      transform: [
        { translateX: stageWidth * 0.28 * (1 - t) },
        { translateY: -stageHeight * 0.18 * (1 - t) },
        { rotate: `${6 - 13 * t}deg` },
        { scale: 0.92 + 0.08 * t },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.prompt,
        { top: stageHeight * 0.05, right: -stageWidth * 0.18, width: stageWidth * 0.72 },
        animatedStyle,
      ]}
    >
      <View style={styles.promptChip}>
        <Text style={styles.promptChipText}>Relationships &amp; People</Text>
      </View>
      <Text style={styles.promptText}>
        What habits do your friends or family have that you find endearing or funny?
      </Text>
    </Animated.View>
  );
});

const LogoMark = memo(function LogoMark({ clock, stageHeight }: ClockProps & { stageHeight: number }) {
  const animatedStyle = useAnimatedStyle(() => {
    const t = phase(clock.value, CINEMATIC_SPLASH.markStart, CINEMATIC_SPLASH.markDuration);
    return { opacity: t, transform: [{ scale: 0.82 + 0.18 * t }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLabel="Memento"
      style={[styles.mark, { top: stageHeight * 0.396 }, animatedStyle]}
    >
      <Animated.Image
        source={LOGO_MARK}
        resizeMode="contain"
        style={styles.markImage}
      />
    </Animated.View>
  );
});

interface AnimatedWordProps extends ClockProps {
  text: string;
  start: number;
  highlight: boolean;
}

const AnimatedWord = memo(function AnimatedWord({ text, start, highlight, clock }: AnimatedWordProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const t = phase(clock.value, start, 700);
    return { opacity: t, transform: [{ translateY: 16 * (1 - t) }] };
  });
  const highlightStyle = useAnimatedStyle(() => {
    const t = phase(clock.value, start + 200, 550);
    return { transform: [{ scaleX: t }] };
  });
  return (
    <Animated.View style={[styles.word, animatedStyle]}>
      {highlight ? <Animated.View style={[styles.highlight, highlightStyle]} /> : null}
      <Text style={[styles.vowText, highlight && styles.vowHighlight]}>{text}</Text>
    </Animated.View>
  );
});

const BrandPromise = memo(function BrandPromise({ clock, stageHeight }: ClockProps & { stageHeight: number }) {
  const ledeStyle = useAnimatedStyle(() => {
    const t = phase(clock.value, CINEMATIC_SPLASH.ledeStart, CINEMATIC_SPLASH.ledeDuration);
    return { opacity: t, transform: [{ translateY: 16 * (1 - t) }] };
  });
  const facesStyle = useAnimatedStyle(() => {
    const t = phase(clock.value, CINEMATIC_SPLASH.facesStart, CINEMATIC_SPLASH.facesDuration);
    return {
      opacity: t,
      transform: [{ translateY: 10 * (1 - t) }, { scale: 0.94 + 0.06 * t }],
    };
  });
  return (
    <View pointerEvents="none" style={[styles.copy, { top: stageHeight * 0.524 }]}>
      <View style={styles.vowLine}>
        {CINEMATIC_SPLASH_WORDS.slice(0, 4).map((word) => (
          <AnimatedWord key={word.text} {...word} clock={clock} />
        ))}
      </View>
      <View style={styles.vowLine}>
        {CINEMATIC_SPLASH_WORDS.slice(4).map((word) => (
          <AnimatedWord key={word.text} {...word} clock={clock} />
        ))}
      </View>
      <Animated.Text style={[styles.lede, ledeStyle]}>Get started on Memento AI</Animated.Text>
      <Animated.View style={[styles.faces, facesStyle]}>
        {[AVATAR_ONE, AVATAR_TWO, AVATAR_THREE].map((source, index) => (
          <Animated.Image
            key={index}
            source={source}
            resizeMode="cover"
            style={[styles.avatar, index > 0 && styles.avatarOverlap]}
          />
        ))}
      </Animated.View>
    </View>
  );
});


export function AnimatedSplash({
  onDone,
  onReady,
  replaySpeed = 1,
  persistOnDone = false,
  loop = false,
}: AnimatedSplashProps) {
  const { width, height } = useWindowDimensions();
  const clock = useSharedValue(0);
  const dismiss = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(false);
  const [nativeSplashHidden, setNativeSplashHidden] = useState(true);
  const [visible, setVisible] = useState(true);
  const finishedRef = useRef(false);
  const mountedRef = useRef(true);
  const readyStartedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const finish = useCallback(() => {
    if (finishedRef.current || !mountedRef.current) return;
    if (!persistOnDone) {
      finishedRef.current = true;
      setVisible(false);
    }
    onDoneRef.current?.();
  }, [persistOnDone]);

  const handleLayout = useCallback(() => {
    if (readyStartedRef.current) return;
    readyStartedRef.current = true;
    if (onReadyRef.current) {
      void onReadyRef.current();
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      mountedRef.current = false;
      subscription.remove();
      cancelAnimation(clock);
      cancelAnimation(dismiss);
    };
  }, [clock, dismiss]);

  useEffect(() => {
    if (!nativeSplashHidden || reduceMotion === null) return;
    if (reduceMotion) {
      clock.value = CINEMATIC_SPLASH.facesStart + CINEMATIC_SPLASH.facesDuration;
      dismiss.value = withDelay(
        CINEMATIC_SPLASH.reducedMotionHold,
        withTiming(1, { duration: 250, easing: SOFT }, (complete) => {
          if (complete) runOnJS(finish)();
        }),
      );
      return;
    }
    const playDuration = Math.round(CINEMATIC_SPLASH.duration / replaySpeed);
    const startAnim = () => {
      clock.value = 0;
      clock.value = withTiming(
        CINEMATIC_SPLASH.duration,
        { duration: playDuration, easing: Easing.linear },
        (complete) => {
          if (complete) {
            if (loop && mountedRef.current) {
              runOnJS(startAnim)();
            } else {
              runOnJS(finish)();
            }
          }
        },
      );
    };

    startAnim();

    return () => {
      cancelAnimation(clock);
    };
  }, [clock, dismiss, finish, loop, nativeSplashHidden, reduceMotion, replaySpeed]);

  const containerStyle = useAnimatedStyle(() => {
    if (persistOnDone) {
      return { opacity: 1 };
    }
    const timedExit = softPhase(
      clock.value,
      CINEMATIC_SPLASH.exitStart,
      CINEMATIC_SPLASH.exitDuration,
    );
    return { opacity: (1 - timedExit) * (1 - dismiss.value) };
  });

  if (!visible) return null;

  return (
    <Animated.View onLayout={handleLayout} style={[styles.container, containerStyle]}>
      <StatusBar hidden animated />
      <CinematicBackdrop clock={clock} />
      {CINEMATIC_SPLASH_PARTICLES.map((particle, index) => (
        <Particle
          key={index}
          {...particle}
          left={width * particle.left}
          height={height}
          clock={clock}
        />
      ))}
      <Sparkle clock={clock} stageWidth={width} stageHeight={height} />
      {CINEMATIC_SPLASH_CARDS.map((card) => (
        <CinematicMemoryCard
          key={card.id}
          card={card}
          clock={clock}
          stageWidth={width}
          stageHeight={height}
        />
      ))}
      <PromptCard clock={clock} stageWidth={width} stageHeight={height} />
      <LogoMark clock={clock} stageHeight={height} />
      <BrandPromise clock={clock} stageHeight={height} />
      <View pointerEvents="none" style={styles.grain}>
        <ImageBackground
          source={GRAIN}
          resizeMode="repeat"
          style={StyleSheet.absoluteFill}
          imageStyle={styles.grainImage}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  sky: { position: 'absolute', top: 0, left: 0, right: 0, height: '46%' },
  paper: { position: 'absolute', top: '40%', left: 0, right: 0, bottom: 0 },
  particle: { position: 'absolute', bottom: '-4%', zIndex: 10, backgroundColor: COLORS.splashDust },
  sparkle: { position: 'absolute', zIndex: 6, width: 36, height: 36 },
  memoryCard: { position: 'absolute', zIndex: 5, alignItems: 'flex-start' },
  memoryPhoto: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    borderRadius: 18,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 4,
  },
  development: { backgroundColor: COLORS.splashDevelop },
  memoryChip: {
    zIndex: 2,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: -10,
    marginLeft: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  memoryChipText: { ...TYPE.eyebrow, color: COLORS.splashInk },
  prompt: {
    position: 'absolute',
    zIndex: 7,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    backgroundColor: COLORS.splashPrompt,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 3,
  },
  promptChip: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLORS.splashChipLagoon,
  },
  promptChipText: { ...TYPE.eyebrow, color: COLORS.splashLagoonText },
  promptText: { ...TYPE.bodySmall, color: COLORS.splashInk },
  mark: {
    position: 'absolute',
    left: '50%',
    width: 90,
    height: 90,
    marginLeft: -45,
    zIndex: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 4,
  },
  markImage: {
    width: '100%',
    height: '100%',
  },
  copy: { position: 'absolute', left: 0, right: 0, zIndex: 12, alignItems: 'center', paddingHorizontal: 28 },
  vowLine: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  word: { position: 'relative' },
  vowText: { ...TYPE.displayTitle, color: COLORS.splashInk, letterSpacing: -1.08 },
  vowHighlight: { ...TYPE.displayTitle, fontStyle: 'italic' },
  highlight: {
    position: 'absolute',
    top: 3,
    left: -4,
    right: -4,
    bottom: 1,
    backgroundColor: COLORS.splashLime,
    borderRadius: 4,
  },
  lede: { ...TYPE.bodyLarge, marginTop: 18, color: COLORS.splashMuted, letterSpacing: -0.32 },
  faces: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: COLORS.textInverse,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  avatarOverlap: { marginLeft: -10 },
  grain: { ...StyleSheet.absoluteFill, zIndex: 30, opacity: 0.09 },
  grainImage: { opacity: 0.35 },
});