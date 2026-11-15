import React from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { Spinner } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { useThemeColors } from '@/hooks/use-theme-colors';

/** Shown while onboarding answers are saved, just before the app opens on Overview. */
export function OnboardingSettingUp({ name }: { name?: string }) {
  const colors = useThemeColors();
  const trimmed = name?.trim();
  const label = trimmed ? `Setting up your Memento, ${trimmed}` : 'Setting up your Memento';
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-6" edges={['top', 'bottom']}>
      <Animated.View
        entering={FadeIn.duration(300).reduceMotion(ReduceMotion.System)}
        className="items-center gap-6"
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityLiveRegion="polite"
      >
        <Spinner color={colors.brand} />
        <Text style={[TYPE.onboardingTitle, { color: colors.textStrong, textAlign: 'center' }]}>
          {/* A no-break space keeps "Memento," and the name on one line (no orphaned name). */}
          Setting up your {trimmed ? 'Memento,\u00A0' : 'Memento'}
          {trimmed ? <Text style={[TYPE.onboardingTitleAccent, { color: colors.brand }]}>{trimmed}</Text> : null}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}
