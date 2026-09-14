import React, { useState, useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { TextInput } from '@/components/ui';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { TYPE } from '@/constants/typography';
import { useFirstRunOnboarding } from '@/hooks/use-first-run-onboarding';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const NICKNAME_IMG = require('../../assets/images/onboarding/quill-ink.png');

export default function NicknameScreen() {
  const router = useRouter();
  const {
    draft,
    setPreferredName,
    setStep,
    handleSkip,
    isSkipping,
  } = useFirstRunOnboarding();

  const [value, setValue] = useState(draft.preferredName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draft.preferredName && !value) {
      setValue(draft.preferredName);
    }
  }, [draft.preferredName, value]);

  const handleContinue = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please share the name you’d like us to use.');
      return;
    }
    setError(null);
    setPreferredName(trimmed);
    setStep(2);
    router.push('/(onboard)/preferences');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <OnboardingShell
      step={1}
      totalSteps={4}
      stepLabel="Step 1 of 4 · Preferred Name"
      onBack={handleBack}
      onSkip={handleSkip}
      isSkipping={isSkipping}
      errorMessage={error}
      primaryAction={{
        label: 'Continue',
        onPress: handleContinue,
        disabled: !value.trim(),
      }}
    >
      <View className="items-center justify-center my-6">
        <Animated.View
          entering={FadeInUp.duration(600)}
          className="size-36 rounded-full bg-fill-weak border border-stroke-weaker items-center justify-center shadow-sm"
        >
          <Image
            source={NICKNAME_IMG}
            style={{ width: 100, height: 100 }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(200)} className="mb-6">
        <Text className="text-text-strong text-center mb-2" style={TYPE.displayTitle}>
          How should we{"\n"}address you?
        </Text>
        <Text className="text-text-base text-center leading-relaxed" style={TYPE.body}>
          We’ll use this name to personalize how Memento talks with you.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300)} className="gap-2">
        <Text className="text-text-base ml-1" style={TYPE.label}>
          Preferred Name
        </Text>
        <TextInput
          value={value}
          onChangeText={(text) => {
            setValue(text);
            if (error) setError(null);
          }}
          placeholder="e.g. Janie, Dad, Chef Mike"
          error={error ?? undefined}
          autoFocus
        />
        <Text className="text-text-weak ml-1 mt-1" style={TYPE.metadata}>
          This is the name your AI companion will use.
        </Text>
      </Animated.View>
    </OnboardingShell>
  );
}
