import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withDelay, 
  withSequence,
  FadeInUp
} from 'react-native-reanimated';
import { COLORS } from '@/constants/tokens';

function Dot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 400 }),
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
          withTiming(0.8, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View className="size-2 rounded-full bg-brand" style={animStyle} />;
}

export function TypingIndicator() {
  return (
    <Animated.View entering={FadeInUp.duration(400)} className="self-start mb-4">
      <View 
        style={styles.bubble}
        className="px-5 py-3.5 rounded-[24px] rounded-bl-[4px] flex-row items-center gap-1.5 border border-stroke-weaker bg-white"
      >
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      },
    }),
  },
});
