import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { TextInput } from '@/components/ui';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { OnboardingIcon } from '@/components/onboarding/OnboardingIcon';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { useFirstRunOnboarding } from '@/hooks/use-first-run-onboarding';
import Animated, { FadeInDown } from 'react-native-reanimated';

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

  return (
    <OnboardingShell
      step={1}
      totalSteps={4}
      indicatorVariant="dots"
      onSkip={handleSkip}
      isSkipping={isSkipping}
      errorMessage={error}
      primaryAction={{
        label: 'Continue',
        onPress: handleContinue,
        disabled: !value.trim(),
      }}
    >
      {/* Figma 19761:10636: icon, heading group (title + lead 12px apart), field; 24px apart */}
      <View style={styles.stack}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <OnboardingIcon name="bouquet" />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.headingContainer}>
          <Text style={styles.titleText}>
            How should we address <Text style={styles.brandItalic}>you?</Text>
          </Text>
          <Text style={styles.subtitleText}>
            We’ll use your name to personalize your experience and how Memento AI talks to you.
          </Text>
        </Animated.View>

      {/* Form Field */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.fieldContainer}>
        <TextInput
          label="Preferred name"
          value={value}
          onChangeText={(text) => {
            setValue(text);
            if (error) setError(null);
          }}
          placeholder="Eg: Jane"
          variant="rounded"
          hint="This could be a nickname"
          error={error ?? undefined}
          autoFocus
        />
      </Animated.View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 24,
    paddingTop: 48,
  },
  headingContainer: {
    gap: 12,
  },
  titleText: {
    ...TYPE.onboardingTitle,
    color: COLORS.textStrong,
  },
  brandItalic: {
    ...TYPE.onboardingTitleAccent,
    color: COLORS.brand,
  },
  subtitleText: {
    ...TYPE.bodySmall,
    color: COLORS.textStrong,
  },
  fieldContainer: {
    gap: 8,
  },
});
