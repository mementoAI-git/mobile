import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Button } from '@/components/ui';
import { FONTS } from '@/constants/tokens';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8 gap-4">
      <Animated.Text className="text-5xl mb-2">🗺️</Animated.Text>
      <Animated.Text 
        className="text-2xl font-semibold text-text-strong text-center"
        style={{ fontFamily: FONTS.sansSemi }}
      >
        Page not found
      </Animated.Text>
      <Animated.Text 
        className="text-base text-text-weak text-center"
        style={{ fontFamily: FONTS.sans }}
      >
        The screen you're looking for doesn't exist or has been moved.
      </Animated.Text>
      <Button onPress={() => router.replace('/(tabs)/overview')} variant="outline" size="lg" className="mt-4 px-10">
        Go Home
      </Button>
    </SafeAreaView>
  );
}
