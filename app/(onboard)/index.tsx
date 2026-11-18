import React from 'react';
import { Image, ScrollView, Text, View, type ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/ui';
import { BrandMarkIcon } from '@/components/onboarding/BrandMarkIcon';
import { OnboardingIcon } from '@/components/onboarding/OnboardingIcon';
import { ONBOARDING_BUTTON_STYLE } from '@/components/onboarding/OnboardingShell';
import { TYPE } from '@/constants/typography';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useFirstRunOnboarding } from '@/hooks/use-first-run-onboarding';

// Ported from web src/pages/onboarding/welcome.tsx.
const FEATURES: { title: string; description: string; image: ImageSourcePropType }[] = [
  {
    title: 'Remember and reflect',
    description:
      'Save your thoughts, experiences, and lessons in one place. Memento helps you reflect on them and keep the memories alive.',
    image: require('../../assets/images/onboarding/welcome-feature-reflect.png'),
  },
  {
    title: 'Converse with your digital twin',
    description:
      'Talk with your AI twin, shaped by your stories and values. It remembers what you share, grows with you, and talks things through with you.',
    image: require('../../assets/images/onboarding/welcome-feature-twin.png'),
  },
  {
    title: 'Share your stories with loved ones',
    description:
      'Invite friends and family to read/hear the stories and memories you’ve created, when you choose — privately and securely.',
    image: require('../../assets/images/onboarding/welcome-feature-share.png'),
  },
];

export default function OnboardWelcomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { handleSkip, isSkipping } = useFirstRunOnboarding();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row justify-end px-4 pt-2">
        {/* Figma option button: 40px fillWeak pill with the 14px x-close icon, in a 44px tap row. */}
        <View className="min-h-[44px] justify-center">
          <Button
            variant="secondary"
            rounded="full"
            iconOnly
            onPress={handleSkip}
            disabled={isSkipping}
            accessibilityLabel="Close and skip onboarding"
            hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
            style={{ width: 40, height: 40, minHeight: 40 }}
          >
            <OnboardingIcon name="close" color={colors.textStrong} />
          </Button>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-4 pt-4 pb-8 gap-8">
        <Animated.View entering={FadeInDown.duration(600)}>
          <BrandMarkIcon size={40} />
          <Text style={[TYPE.onboardingTitle, { color: colors.textStrong, marginTop: 20, marginBottom: 12 }]}>
            Hey there,{' '}
            <Text style={[TYPE.onboardingTitleAccent, { color: colors.brand }]}>welcome</Text>
            {' '}to Memento AI
          </Text>
          <Text style={[TYPE.body, { color: colors.textStrong }]}>
            I’m your personal interactive companion for self-reflection, memory and legacy.
            Together, we’ll capture your stories and experiences, one thought, one moment at a time.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(100)} className="gap-5">
          <Text style={[TYPE.bodySmall, { color: colors.onboardingAccentText }]}>What can you do on Memento?</Text>
          {FEATURES.map((feature) => (
            <View key={feature.title} className="flex-row items-start gap-4">
              <Image
                source={feature.image}
                accessibilityIgnoresInvertColors
                style={{ width: 40, height: 40, borderRadius: 6 }}
              />
              <View className="flex-1 gap-1">
                <Text style={[TYPE.bodyStrong, { color: colors.textStrong }]}>{feature.title}</Text>
                <Text style={[TYPE.bodySmall, { color: colors.textBase }]}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(600).delay(200)}
          className="gap-2 rounded-2xl border p-4"
          style={{ backgroundColor: colors.privacyNoteFill, borderColor: colors.privacyNoteStroke }}
        >
          <Text style={[TYPE.monoLabel, { color: colors.privacyNoteLabel }]}>MEMENTO IS PRIVATE BY DESIGN</Text>
          <Text style={[TYPE.mono, { color: colors.textStrong }]}>
            Your entries are private to your account by default and encrypted in transit and at
            rest. You decide what to share, when to share, and with whom.
          </Text>
        </Animated.View>

        <View className="flex-row justify-end gap-2.5">
          <Button
            variant="outline"
            size="lg"
            onPress={handleSkip}
            disabled={isSkipping}
            rounded="full"
            style={[ONBOARDING_BUTTON_STYLE, { minWidth: 97 }]}
          >
            Skip
          </Button>
          <Button
            size="lg"
            onPress={() => router.push('/(onboard)/nickname')}
            disabled={isSkipping}
            rounded="full"
            style={[ONBOARDING_BUTTON_STYLE, { minWidth: 128 }]}
          >
            Continue
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
