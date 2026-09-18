import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, BookOpen, Compass } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { TYPE } from '@/constants/typography';
import { COLORS } from '@/constants/tokens';
import { useFirstRunOnboarding } from '@/hooks/use-first-run-onboarding';

export default function SummaryScreen() {
  const router = useRouter();
  const {
    draft,
    summary,
    handleComplete,
    isCompleting,
    completionError,
  } = useFirstRunOnboarding();

  const preferredName = draft.preferredName.trim();
  const title = preferredName
    ? `You're all set,\n${preferredName}.`
    : `You're all set\nfor Memento.`;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(onboard)/preferences');
    }
  };

  return (
    <OnboardingShell
      step={4}
      totalSteps={4}
      stepLabel="Step 4 of 4 · Summary"
      onBack={handleBack}
      errorMessage={
        completionError ? 'Could not complete onboarding. Please try again.' : null
      }
      primaryAction={{
        label: 'Start using Memento AI',
        onPress: handleComplete,
        loading: isCompleting,
      }}
    >
      <Animated.View entering={FadeInDown.duration(400)} className="pt-2 pb-6 gap-5">
        {/* Title */}
        <View className="mb-2">
          <Text className="text-text-strong mb-2" style={TYPE.displayTitle}>
            {title}
          </Text>
          <Text className="text-text-base leading-relaxed" style={TYPE.body}>
            Here is what we've gathered to personalize your companion experience.
          </Text>
        </View>

        {/* Panel 1: Why you are here */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          className="bg-card border border-stroke-weaker rounded-2xl p-4 gap-2 shadow-sm"
        >
          <View className="flex-row items-center gap-2">
            <Compass size={16} color={COLORS.brand} />
            <Text className="text-brand uppercase tracking-wider" style={TYPE.eyebrow}>
              Why you are here
            </Text>
          </View>
          <Text className="text-text-strong" style={TYPE.label}>
            {summary.whyYouAreHere || 'To preserve precious memories and reflections.'}
          </Text>
        </Animated.View>

        {/* Panel 2: About you */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          className="bg-card border border-stroke-weaker rounded-2xl p-4 gap-2 shadow-sm"
        >
          <View className="flex-row items-center gap-2">
            <Heart size={16} color={COLORS.brand} />
            <Text className="text-brand uppercase tracking-wider" style={TYPE.eyebrow}>
              About you
            </Text>
          </View>
          <Text className="text-text-base leading-relaxed" style={TYPE.body}>
            {summary.aboutYou || 'Ready to capture and reflect on personal journeys.'}
          </Text>
        </Animated.View>

        {/* Panel 3: Starting areas */}
        <Animated.View
          entering={FadeInDown.delay(300)}
          className="bg-card border border-stroke-weaker rounded-2xl p-4 gap-3 shadow-sm"
        >
          <View className="flex-row items-center gap-2">
            <BookOpen size={16} color={COLORS.brand} />
            <Text className="text-brand uppercase tracking-wider" style={TYPE.eyebrow}>
              Starting life areas
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {summary.startingAreas.length > 0 ? (
              summary.startingAreas.map((area) => (
                <View
                  key={area}
                  className="px-3 py-1.5 rounded-full bg-brand/[0.06] border border-brand/20"
                >
                  <Text className="text-brand" style={TYPE.label}>
                    {area}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-text-weak" style={TYPE.label}>
                General Reflection
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Edit note */}
        <Animated.View entering={FadeInDown.delay(400)} className="pt-2 items-center">
          <Text className="text-text-weak text-center" style={TYPE.metadata}>
            You can adjust and explore more areas anytime in Settings.
          </Text>
        </Animated.View>
      </Animated.View>
    </OnboardingShell>
  );
}
