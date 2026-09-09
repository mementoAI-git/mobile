import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { 
  cancelAnimation,
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withDelay, 
  withSequence,
  FadeInUp
} from 'react-native-reanimated';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const LOADING_PHRASES = [
  "Reflecting on your words...",
  "Brewing a thoughtful reply...",
  "Stirring a pinch of stardust...",
  "Untangling thought-ribbons...",
  "Formulating response...",
  "Polishing wisdom engines..."
];

function Dot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400 }),
          withTiming(0.8, { duration: 400 })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 400 }),
          withTiming(0.4, { duration: 400 })
        ),
        -1,
        true
      )
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View className="size-2 rounded-full bg-brand" style={animStyle} />;
}

export function TypingIndicator() {
  const [phrase, setPhrase] = useState(LOADING_PHRASES[0]);

  useEffect(() => {
    const id = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * LOADING_PHRASES.length);
      setPhrase(LOADING_PHRASES[randomIdx]);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <Animated.View entering={FadeInUp.duration(400)} className="self-start mb-5 max-w-[85%]">
      {/* Symmetric White Bubble for AI typing state */}
      <View 
        style={styles.bubble}
        className="px-5 py-3.5 bg-white rounded-[20px] rounded-bl-[4px] flex-row items-center gap-3.5"
      >
        {/* Pulsing Dots */}
        <View className="flex-row items-center gap-1.5">
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </View>

        {/* Dynamic Whimsical Phrase */}
        <Text 
          className="text-xs text-text-weak italic"
          style={TYPE.bodySmall}
        >
          {phrase}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
});
