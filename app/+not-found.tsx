import React from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/EmptyState';

const NOT_FOUND_IMG = require('../assets/images/illustrations/fluent-emoji-flat_ringed-planet.png');

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <EmptyState
        image={NOT_FOUND_IMG}
        title="Page not found"
        description="The screen you're looking for doesn't exist or has been moved."
        actionLabel="Go home"
        onAction={() => router.replace('/(tabs)/overview')}
      />
    </SafeAreaView>
  );
}
